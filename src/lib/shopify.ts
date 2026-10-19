import { naarHtml, zonderBouwstenen } from "./markdown";
import type { Koppeling } from "./types";
import type { Geplaatst, Plaatsing } from "./wordpress";

// Koppeling met Shopify via de Admin API (blogartikelen). Nodig: een app in je winkel met de rechten
// read_content en write_content, en het Admin API access token (begint met shpat_).
const VERSIE = "2025-10";

export class ShopifyFout extends Error {}

export function shopify(k: Koppeling) {
  const winkel = (k.shopWinkel ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const token = (k.shopToken ?? "").trim();
  if (!winkel || !token) throw new ShopifyFout("Vul bij de Shopify-koppeling je winkeladres (…myshopify.com) en het Admin API access token in.");
  if (!winkel.endsWith(".myshopify.com")) throw new ShopifyFout("Gebruik het adres dat eindigt op .myshopify.com (te vinden in Shopify onder Instellingen → Domeinen).");
  const api = `https://${winkel}/admin/api/${VERSIE}`;

  async function shop<T>(pad: string, methode = "GET", body?: unknown): Promise<T> {
    const res = await fetch(api + pad, {
      method: methode,
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    const tekst = await res.text();
    if (!res.ok) {
      if (res.status === 401) throw new ShopifyFout("Shopify herkent dit token niet. Kopieer het Admin API access token opnieuw (begint met shpat_).");
      if (res.status === 403) throw new ShopifyFout("De app mist rechten. Zet read_content en write_content aan en installeer de app opnieuw.");
      if (res.status === 404 && pad.startsWith("/shop")) throw new ShopifyFout("Deze winkel bestaat niet of het adres klopt niet.");
      let melding = tekst.slice(0, 200);
      try {
        const j = JSON.parse(tekst) as { errors?: unknown };
        melding = typeof j.errors === "string" ? j.errors : JSON.stringify(j.errors ?? j);
      } catch {}
      throw new ShopifyFout(`Shopify gaf een fout (${res.status}): ${melding}`);
    }
    return (tekst ? JSON.parse(tekst) : null) as T;
  }

  type Blog = { id: number; title: string; handle: string };
  let blogs: Blog[] | null = null;
  const alleBlogs = async () => (blogs ??= (await shop<{ blogs: Blog[] }>("/blogs.json?fields=id,title,handle")).blogs);
  // De blog waarin de artikelen komen: de ingestelde, anders de eerste.
  async function doelBlog(): Promise<Blog> {
    const lijst = await alleBlogs();
    const id = (k.shopBlogId ?? "").trim();
    const gekozen = id ? lijst.find((b) => String(b.id) === id || b.handle === id) : lijst[0];
    if (!gekozen) throw new ShopifyFout("Er is nog geen blog in je winkel. Maak er een aan via Online Store → Blogberichten → Blogs beheren.");
    return gekozen;
  }

  let domein: string | null = null;
  const winkelDomein = async () => (domein ??= (await shop<{ shop: { domain: string } }>("/shop.json?fields=domain")).shop.domain);

  return {
    async test(): Promise<string> {
      const { shop: s } = await shop<{ shop: { name: string } }>("/shop.json?fields=name");
      const { access_scopes } = await fetch(`https://${winkel}/admin/oauth/access_scopes.json`, { headers: { "X-Shopify-Access-Token": token } })
        .then((r) => r.json() as Promise<{ access_scopes?: { handle: string }[] }>)
        .catch(() => ({ access_scopes: [] as { handle: string }[] }));
      const rechten = new Set((access_scopes ?? []).map((a) => a.handle));
      if (rechten.size && !rechten.has("write_content")) throw new ShopifyFout("De app mag nog geen blogs schrijven. Zet write_content aan en installeer de app opnieuw.");
      const b = await doelBlog();
      const { count } = await shop<{ count: number }>(`/blogs/${b.id}/articles/count.json`);
      return `Verbonden met ${s.name} · blog "${b.title}" · ${count} ${count === 1 ? "artikel" : "artikelen"}`;
    },

    // Shopify kent geen categorieën; we gebruiken de blogs van de winkel als keuze en zetten de categorie als tag.
    async categorieen(): Promise<string[]> {
      return [];
    },

    async berichten(): Promise<{ titel: string; url: string; adres: string }[]> {
      const b = await doelBlog();
      const d = await winkelDomein();
      const { articles } = await shop<{ articles: { title: string; handle: string }[] }>(`/blogs/${b.id}/articles.json?limit=250&fields=title,handle`);
      return articles.map((a) => ({ titel: a.title, adres: a.handle, url: `https://${d}/blogs/${b.handle}/${a.handle}` }));
    },

    async adresVrij(adres: string, eigenId?: string | null): Promise<boolean> {
      const b = await doelBlog();
      const { articles } = await shop<{ articles: { id: number }[] }>(`/blogs/${b.id}/articles.json?handle=${encodeURIComponent(adres)}&fields=id&published_status=any`);
      return articles.every((a) => String(a.id) === eigenId);
    },

    async plaats(p: Plaatsing, bestaandId?: string | null): Promise<Geplaatst> {
      const b = await doelBlog();
      const artikel: Record<string, unknown> = {
        title: p.titel,
        // Bouwstenen zijn voor de WordPress-plugin; in Shopify laten we ze weg.
        body_html: naarHtml(zonderBouwstenen(p.tekst)),
        tags: p.categorie ?? "",
      };
      if (p.intro) artikel.summary_html = `<p>${p.intro.replace(/</g, "&lt;")}</p>`;
      if (p.adres && !bestaandId) artikel.handle = p.adres;
      if (p.beeld) artikel.image = { attachment: p.beeld.data.toString("base64"), alt: p.beeld.alt, filename: p.beeld.naam };
      // Live: nu zichtbaar. Gepland: zichtbaar vanaf de gekozen datum (Shopify toont hem pas dan). Concept: verborgen.
      if (p.status === "live") artikel.published = true;
      else if (p.status === "gepland" && p.wanneer) {
        artikel.published = true;
        artikel.published_at = new Date(p.wanneer).toISOString();
      } else artikel.published = false;

      const pad = bestaandId ? `/blogs/${b.id}/articles/${bestaandId}.json` : `/blogs/${b.id}/articles.json`;
      const { article } = await shop<{ article: { id: number; handle: string } }>(pad, bestaandId ? "PUT" : "POST", { article: artikel });
      return { id: String(article.id), adres: article.handle, url: `https://${await winkelDomein()}/blogs/${b.handle}/${article.handle}` };
    },

    async verwijder(id: string) {
      const b = await doelBlog();
      await shop(`/blogs/${b.id}/articles/${id}.json`, "DELETE");
    },
  };
}
