// "Los alles op": uit de laatste lokale analyse per bedrijfsprofiel de concrete verbeteringen halen,
// klaar om te kopiëren en zelf in je profiel op Google te plakken.
// Automatisch doorvoeren kan alleen met een eigen Google-koppeling (Google Cloud-project met goedgekeurde
// Business Profile API); die zit (nog) niet in de studio.
import type { LokaalAnalyse, ProfielAnalyse, Vestiging } from "./lokaal";

export type SuggestieSoort = "beschrijving" | "categorieen" | "link" | "review_antwoord" | "bericht";
export type SuggestieStatus = "open" | "gedaan" | "overgeslagen";

export interface Suggestie {
  id: string; // vast per analyse: profiel + soort + volgnummer
  profiel_id: string;
  soort: SuggestieSoort;
  nu?: string;
  tekst: string; // wat je in Google plakt
  review?: string;
  week?: string; // voor berichten: in welke week plaatsen
  waar: string; // waar je het in je profiel aanpast
}

export const SOORT_LABEL: Record<SuggestieSoort, string> = {
  beschrijving: "Nieuwe beschrijving",
  categorieen: "Extra categorieën",
  link: "Website-link naar je eigen pagina",
  review_antwoord: "Antwoord op review",
  bericht: "Google-bericht",
};

const WAAR: Record<SuggestieSoort, string> = {
  beschrijving: "Profiel bewerken → Bedrijfsgegevens → Beschrijving",
  categorieen: "Profiel bewerken → Bedrijfscategorie → Nog een categorie toevoegen",
  link: "Profiel bewerken → Contact → Website",
  review_antwoord: "Reviews lezen → Beantwoorden",
  bericht: "Update toevoegen → Update toevoegen",
};

// UTM-codes, zodat je in Google Analytics ziet hoeveel bezoek via je bedrijfsprofiel komt.
export function metUtm(url: string, plaats: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "google");
    u.searchParams.set("utm_medium", "organic");
    u.searchParams.set("utm_campaign", `bedrijfsprofiel-${plaats.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}`);
    return u.toString();
  } catch {
    return url;
  }
}

const plaatsUit = (adres: string) => /\d{4}\s?[A-Z]{2}\s+(.+)$/.exec(adres)?.[1]?.trim() ?? "";

// Week-aanduiding voor de berichten: deze week, volgende week, …
function weekVan(i: number): string {
  const d = new Date();
  d.setDate(d.getDate() + i * 7);
  const maandag = new Date(d);
  maandag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return i === 0 ? "deze week" : `week van ${maandag.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}`;
}

function categorieVoorstel(p: ProfielAnalyse, alle: ProfielAnalyse[]): string[] {
  if (!p.data) return [];
  const heb = new Set([p.data.categorie, ...p.data.extra].map((c) => c.toLowerCase()));
  const pool = [...p.concurrenten.map((c) => c.categorie), ...alle.filter((x) => x !== p && x.data).flatMap((x) => [x.data!.categorie, ...x.data!.extra])];
  const telling = new Map<string, number>();
  for (const c of pool) if (c && !heb.has(c.toLowerCase())) telling.set(c, (telling.get(c) ?? 0) + 1);
  return [...telling].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 3);
}

export function suggesties(a: LokaalAnalyse, vestigingen: Vestiging[]): Suggestie[] {
  const uit: Suggestie[] = [];
  for (const p of a.profielen) {
    const v = vestigingen.find((x) => x.id === p.profiel_id);
    if (!p.data || !v) continue;
    const id = (soort: SuggestieSoort, n = 0) => `${a.id ?? "a"}:${p.profiel_id}:${soort}:${n}`;
    const plaats = plaatsUit(p.data.adres);

    if (p.teksten?.beschrijving && p.teksten.beschrijving.trim() !== p.data.beschrijving.trim())
      uit.push({ id: id("beschrijving"), profiel_id: v.id, soort: "beschrijving", nu: p.data.beschrijving || "leeg", tekst: p.teksten.beschrijving, waar: WAAR.beschrijving });

    const cats = categorieVoorstel(p, a.profielen);
    if (cats.length) uit.push({ id: id("categorieen"), profiel_id: v.id, soort: "categorieen", nu: p.data.extra.join(", ") || "geen", tekst: cats.join("\n"), waar: WAAR.categorieen });

    if (v.pagina_url && p.checks.find((c) => c.id === "link")?.ok === false)
      uit.push({ id: id("link"), profiel_id: v.id, soort: "link", nu: p.data.website || "geen", tekst: metUtm(v.pagina_url, plaats), waar: WAAR.link });

    (p.teksten?.review_antwoorden ?? []).forEach((r, i) =>
      uit.push({ id: id("review_antwoord", i), profiel_id: v.id, soort: "review_antwoord", review: r.review, tekst: r.antwoord, waar: WAAR.review_antwoord })
    );

    (p.teksten?.berichten ?? []).forEach((b, i) => uit.push({ id: id("bericht", i), profiel_id: v.id, soort: "bericht", tekst: b, week: weekVan(i), waar: WAAR.bericht }));
  }
  return uit;
}
