import { naarHtml, zonderBouwstenen } from "./markdown";
import type { Koppeling } from "./types";
import type { Geplaatst, Plaatsing } from "./wordpress";

// Ander platform met een eigen koppeling. De studio stuurt de blog als JSON naar één adres, met de sleutel in de kop
// "x-api-key". Werkt met elke site die zo'n adres heeft (bijv. Lovable/Supabase, Webflow via Make of Zapier, een eigen site).
//
// Wat de studio stuurt (POST):
//   { title, slug, excerpt, html, markdown, meta_description, category, tags, status: "live"|"gepland"|"concept",
//     publish_at (ISO of null), image: { base64, mime, filename, alt } | null }
// Wat de studio terug verwacht (JSON): { id, url } — beide optioneel.
// Optioneel: GET <adres>?slug=… geeft { exists: true|false } (dan controleert de studio of het adres vrij is).

export class ApiFout extends Error {}

export function eigenApi(k: Koppeling) {
  const adres = (k.apiUrl ?? "").trim();
  const sleutel = (k.apiSleutel ?? "").trim();
  if (!/^https:\/\//i.test(adres)) throw new ApiFout("Vul het adres (https://…) van je eigen blog-koppeling in.");

  async function roep(methode: string, url: string, body?: unknown) {
    const res = await fetch(url, {
      method: methode,
      headers: { ...(sleutel ? { "x-api-key": sleutel } : {}), "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    const tekst = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new ApiFout("Je koppeling weigert de sleutel. Controleer de API-sleutel.");
      throw new ApiFout(`Je koppeling gaf een fout (${res.status}): ${tekst.slice(0, 200)}`);
    }
    try {
      return tekst ? JSON.parse(tekst) : {};
    } catch {
      return {};
    }
  }

  return {
    async test(): Promise<string> {
      await roep("GET", adres);
      return "Je koppeling reageert. Plaats een testblog als concept om het helemaal te controleren.";
    },
    async categorieen(): Promise<string[]> {
      return [];
    },
    async berichten(): Promise<{ titel: string; url: string; adres: string }[]> {
      return [];
    },
    async adresVrij(slug: string): Promise<boolean> {
      try {
        const r = (await roep("GET", `${adres}${adres.includes("?") ? "&" : "?"}slug=${encodeURIComponent(slug)}`)) as { exists?: boolean };
        return r.exists !== true;
      } catch {
        return true; // koppeling kent deze controle niet
      }
    },
    async plaats(p: Plaatsing, bestaandId?: string | null): Promise<Geplaatst> {
      const md = zonderBouwstenen(p.tekst);
      const r = (await roep(bestaandId ? "PUT" : "POST", bestaandId ? `${adres}${adres.includes("?") ? "&" : "?"}id=${encodeURIComponent(bestaandId)}` : adres, {
        title: p.titel,
        slug: p.adres ?? "",
        excerpt: p.intro ?? "",
        html: naarHtml(md),
        markdown: md,
        meta_description: p.meta ?? "",
        category: p.categorie ?? "",
        tags: p.tags ?? [],
        status: p.status,
        publish_at: p.status === "gepland" ? (p.wanneer ?? null) : null,
        image: p.beeld ? { base64: p.beeld.data.toString("base64"), mime: p.beeld.mime, filename: p.beeld.naam, alt: p.beeld.alt } : null,
      })) as { id?: string | number; url?: string; slug?: string };
      return { id: String(r.id ?? bestaandId ?? p.adres ?? ""), adres: r.slug ?? p.adres ?? "", url: r.url ?? "" };
    },
    async verwijder(id: string) {
      await roep("DELETE", `${adres}${adres.includes("?") ? "&" : "?"}id=${encodeURIComponent(id)}`);
    },
  };
}
