import { naarHtml, zonderBouwstenen } from "./markdown";
import type { Koppeling } from "./types";
import type { Geplaatst, Plaatsing } from "./wordpress";

// Koppeling met Shopify via de Admin API (blogartikelen).
// Sinds 1 januari 2026 maak je de app in het Shopify Dev Dashboard. Dat geeft een Klant-ID (Client ID) en een
// Klantgeheim (Client secret). Daarmee vraagt de studio zelf een sleutel op (client credentials); die sleutel
// verloopt na 24 uur en wordt dan vanzelf vernieuwd. Een oude vaste sleutel (shpat_, van vóór 2026) werkt ook nog.
// Rechten van de app: read_content en write_content.
const VERSIE = "2025-10";

export class ShopifyFout extends Error {}

// Opgehaalde sleutels blijven in het geheugen tot vlak voor ze verlopen.
const sleutels = new Map<string, { token: string; tot: number }>();

const OAUTH_FOUTEN: Record<string, string> = {
  application_cannot_be_found: "Shopify kent deze Klant-ID niet. Kopieer de Client ID opnieuw uit het Dev Dashboard (je app → Settings).",
  invalid_client: "De Klant-ID of het Klantgeheim klopt niet. Kopieer beide opnieuw uit het Dev Dashboard (je app → Settings).",
  shop_not_permitted:
    "Shopify staat deze koppeling niet toe: de app hoort bij een andere organisatie dan de winkel. Laat de app maken door de winkeleigenaar, of door een personeelsaccount van de winkel met het recht App-ontwikkeling (een samenwerkingsaccount kan dit niet).",
  app_not_installed: "De app is nog niet op deze winkel geïnstalleerd. Klik in het Dev Dashboard bij je app op Install app en kies je winkel.",
};

async function vraagSleutel(winkel: string, id: string, geheim: string): Promise<{ token: string; tot: number }> {
  let res: Response;
  try {
    res = await fetch(`https://${winkel}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: geheim }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ShopifyFout("Shopify is niet bereikbaar. Controleer je internetverbinding en het winkeladres.");
  }
  const tekst = await res.text();
  let j: { access_token?: string; expires_in?: number; error?: string; error_description?: string } = {};
  try {
    j = JSON.parse(tekst);
  } catch {}
  if (res.ok && j.access_token) return { token: j.access_token, tot: Date.now() + (j.expires_in ?? 86_399) * 1000 };
  if (res.status === 404 || /Store unavailable|shop-404/i.test(tekst)) throw new ShopifyFout("Deze winkel bestaat niet of het adres klopt niet. Gebruik het adres dat eindigt op .myshopify.com.");
  const code = j.error ?? tekst.match(/Oauth error ([a-z_]+)/i)?.[1];
  if (code && OAUTH_FOUTEN[code]) throw new ShopifyFout(OAUTH_FOUTEN[code]);
  throw new ShopifyFout(`Shopify gaf geen sleutel (${res.status}${code ? `, ${code}` : ""}). Controleer Klant-ID, Klantgeheim en of de app op deze winkel is geïnstalleerd.`);
}

export function shopify(k: Koppeling) {
  let winkel = (k.shopWinkel ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (winkel && !winkel.includes(".")) winkel += ".myshopify.com";
  const id = (k.shopClientId ?? "").trim();
  const geheim = (k.shopClientSecret ?? "").trim();
  const vast = (k.shopToken ?? "").trim();
  const metGeheim = !!(id || geheim);

  if (!winkel) throw new ShopifyFout("Vul je winkeladres in (eindigt op .myshopify.com).");
  if (!winkel.endsWith(".myshopify.com")) throw new ShopifyFout("Gebruik het adres dat eindigt op .myshopify.com (te vinden in Shopify onder Instellingen → Domeinen).");
  if (id.startsWith("shpss_")) throw new ShopifyFout("Bij Klant-ID staat het Klantgeheim (begint met shpss_). Zet dat bij Klantgeheim en vul bij Klant-ID de Client ID in.");
  if (vast.startsWith("shpss_")) throw new ShopifyFout("Dit is een Klantgeheim (begint met shpss_), geen oude vaste sleutel. Vul het in bij Klantgeheim, samen met de Klant-ID.");
  if (metGeheim && (!id || !geheim)) throw new ShopifyFout(id ? "Vul ook het Klantgeheim (Client secret) in." : "Vul ook de Klant-ID (Client ID) in.");
  if (!metGeheim && !vast) throw new ShopifyFout("Vul de Klant-ID (Client ID) en het Klantgeheim (Client secret) van je app uit het Shopify Dev Dashboard in.");

  const api = `https://${winkel}/admin/api/${VERSIE}`;
  const sleutelNaam = `${winkel}|${id}|${geheim}`;

  async function sleutel(opnieuw = false): Promise<string> {
    if (!metGeheim) return vast;
    const bewaard = sleutels.get(sleutelNaam);
    if (!opnieuw && bewaard && bewaard.tot - Date.now() > 5 * 60_000) return bewaard.token;
    const s = await vraagSleutel(winkel, id, geheim);
    sleutels.set(sleutelNaam, s);
    return s.token;
  }

  async function shop<T>(pad: string, methode = "GET", body?: unknown, opnieuw = false): Promise<T> {
    const res = await fetch(api + pad, {
      method: methode,
      headers: { "X-Shopify-Access-Token": await sleutel(opnieuw), "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    const tekst = await res.text();
    if (!res.ok) {
      // Sleutel verlopen of ingetrokken: één keer een nieuwe halen en opnieuw proberen.
      if (res.status === 401 && metGeheim && !opnieuw) return shop<T>(pad, methode, body, true);
      if (res.status === 401)
        throw new ShopifyFout(
          metGeheim
            ? "Shopify accepteert de sleutel niet. Controleer of de app nog op deze winkel is geïnstalleerd."
            : "Shopify herkent deze oude sleutel niet meer. Maak een app in het Dev Dashboard en vul de Klant-ID en het Klantgeheim in."
        );
      if (res.status === 403)
        throw new ShopifyFout(
          "De app mist rechten. Zet in het Dev Dashboard bij je app (Versions) de scopes read_content en write_content aan, klik Release en keur de nieuwe rechten goed in je winkel."
        );
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
      const { access_scopes } = await fetch(`https://${winkel}/admin/oauth/access_scopes.json`, { headers: { "X-Shopify-Access-Token": await sleutel() } })
        .then((r) => r.json() as Promise<{ access_scopes?: { handle: string }[] }>)
        .catch(() => ({ access_scopes: [] as { handle: string }[] }));
      const rechten = new Set((access_scopes ?? []).map((a) => a.handle));
      if (rechten.size && !rechten.has("write_content"))
        throw new ShopifyFout("De app mag nog geen blogs schrijven. Zet in het Dev Dashboard bij Versions de scope write_content aan, klik Release en keur de rechten goed in je winkel.");
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
