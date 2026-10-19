import { naarHtml } from "./markdown";
import type { Koppeling } from "./types";

// Koppeling met WordPress via de ingebouwde REST API en een Application Password.
export interface Plaatsing {
  titel: string;
  tekst: string; // Markdown
  intro?: string;
  adres?: string;
  categorie?: string;
  tags?: string[];
  meta?: string;
  beeld?: { data: Buffer; mime: string; naam: string; alt: string };
  status: "live" | "gepland" | "concept";
  wanneer?: string; // ISO, bij gepland
}

export interface Geplaatst {
  id: string;
  adres: string;
  url: string;
}

export class WordPressFout extends Error {}

export function wordpress(k: Koppeling) {
  const site = (k.wpUrl ?? "").trim().replace(/\/+$/, "");
  const gebruiker = (k.wpGebruiker ?? "").trim();
  const wachtwoord = (k.wpWachtwoord ?? "").replace(/\s+/g, "");
  if (!site || !gebruiker || !wachtwoord) throw new WordPressFout("Vul bij de WordPress-koppeling het adres, de gebruikersnaam en het Application Password in.");
  const api = `${site}/wp-json/wp/v2`;
  const inlog = `Basic ${Buffer.from(`${gebruiker}:${wachtwoord}`).toString("base64")}`;

  async function wp<T>(pad: string, opties: { methode?: string; json?: unknown; ruw?: Buffer; kop?: Record<string, string> } = {}): Promise<T> {
    const kop: Record<string, string> = { Authorization: inlog, ...opties.kop };
    if (opties.json !== undefined) kop["Content-Type"] = "application/json";
    const res = await fetch(api + pad, {
      method: opties.methode ?? (opties.json || opties.ruw ? "POST" : "GET"),
      headers: kop,
      body: opties.ruw ? new Uint8Array(opties.ruw) : opties.json !== undefined ? JSON.stringify(opties.json) : undefined,
      signal: AbortSignal.timeout(45_000),
    });
    const body = await res.text();
    if (!res.ok) {
      if (res.status === 401)
        throw new WordPressFout("WordPress herkent deze inlog niet. Gebruik de gebruikersnaam van het account waar je het Application Password hebt gemaakt (vaak je e-mailadres).");
      if (res.status === 404 && pad === "/users/me") throw new WordPressFout("Op dit adres is geen WordPress REST API gevonden. Klopt het website-adres?");
      let melding = body.slice(0, 200);
      try {
        melding = (JSON.parse(body) as { message?: string }).message ?? melding;
      } catch {}
      throw new WordPressFout(`WordPress gaf een fout (${res.status}): ${melding}`);
    }
    return (body ? JSON.parse(body) : null) as T;
  }

  type Term = { id: number; name: string; slug: string };
  let termen: Term[] | null = null;
  const alleCategorieen = async () => (termen ??= await wp<Term[]>("/categories?per_page=100&_fields=id,name,slug"));

  return {
    // Controleert of de inlog klopt én of deze gebruiker mag publiceren en afbeeldingen uploaden.
    async test(): Promise<string> {
      const ik = await wp<{ name: string; capabilities?: Record<string, boolean> }>("/users/me?context=edit&_fields=name,capabilities");
      const mag = ik.capabilities ?? {};
      const mist = [!mag.publish_posts && "berichten publiceren", !mag.upload_files && "afbeeldingen uploaden"].filter(Boolean);
      if (mist.length) throw new WordPressFout(`Ingelogd als "${ik.name}", maar deze gebruiker mag geen ${mist.join(" en ")}. Geef hem de rol Auteur, Editor of Beheerder.`);
      const aantal = (await wp<unknown[]>("/posts?per_page=100&_fields=id")).length;
      return `Verbonden als ${ik.name} · ${aantal} ${aantal === 1 ? "bericht" : "berichten"} op de site`;
    },

    async categorieen(): Promise<string[]> {
      return (await alleCategorieen()).filter((t) => t.slug !== "uncategorized" && t.slug !== "geen-categorie").map((t) => t.name.replace(/&amp;/g, "&"));
    },

    async berichten(): Promise<{ titel: string; url: string; adres: string }[]> {
      const lijst = await wp<{ slug: string; link: string; title: { rendered: string } }[]>("/posts?per_page=100&_fields=slug,link,title");
      return lijst.map((p) => ({ titel: p.title.rendered.replace(/<[^>]+>/g, "").replace(/&#8217;/g, "’").replace(/&amp;/g, "&"), url: p.link, adres: p.slug }));
    },

    // Bestaat er al een bericht of pagina met dit adres (ook ingepland of concept)?
    async adresVrij(adres: string, eigenId?: string | null): Promise<boolean> {
      const a = encodeURIComponent(adres);
      const status = "publish,future,draft,pending,private";
      const [p, q] = await Promise.all([
        wp<{ id: number }[]>(`/posts?slug=${a}&status=${status}&_fields=id`),
        wp<{ id: number }[]>(`/pages?slug=${a}&status=${status}&_fields=id`),
      ]);
      return [...p, ...q].every((x) => String(x.id) === eigenId);
    },

    async plaats(b: Plaatsing, bestaandId?: string | null): Promise<Geplaatst> {
      let media: number | undefined;
      if (b.beeld) {
        const m = await wp<{ id: number }>("/media", {
          ruw: b.beeld.data,
          kop: { "Content-Type": b.beeld.mime, "Content-Disposition": `attachment; filename="${b.beeld.naam}"` },
        });
        media = m.id;
        await wp(`/media/${m.id}`, { json: { alt_text: b.beeld.alt } }).catch(() => null);
      }
      const cat = b.categorie ? (await alleCategorieen()).find((t) => t.name.toLowerCase() === b.categorie!.toLowerCase())?.id : undefined;
      const velden: Record<string, unknown> = {
        title: b.titel,
        content: naarHtml(b.tekst),
        status: b.status === "live" ? "publish" : b.status === "gepland" ? "future" : "draft",
      };
      if (b.status === "gepland" && b.wanneer) velden.date_gmt = new Date(b.wanneer).toISOString().slice(0, 19);
      if (b.intro) velden.excerpt = b.intro;
      if (b.adres && !bestaandId) velden.slug = b.adres;
      if (cat) velden.categories = [cat];
      if (media) velden.featured_media = media;
      const r = await wp<{ id: number; slug: string; link: string }>(bestaandId ? `/posts/${bestaandId}` : "/posts", { json: velden });
      return { id: String(r.id), adres: r.slug, url: r.link };
    },

    async verwijder(id: string) {
      await wp(`/posts/${id}?force=true`, { methode: "DELETE" });
    },
  };
}
