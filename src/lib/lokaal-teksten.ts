// Teksten voor een Google Bedrijfsprofiel, geschreven met je eigen OpenRouter-sleutel:
// een nieuwe beschrijving, Google-berichten, antwoorden op open reviews en wat opvalt.
import { json } from "./ai";
import type { ProfielAnalyse, Teksten } from "./lokaal";
import type { Instellingen } from "./types";

const toon = (n: number | null | undefined) => (n === null || n === undefined ? "?" : String(n));

function invoer(i: Instellingen, pa: ProfielAnalyse, plaats: string): string {
  const d = pa.data!;
  const open = pa.reviews.open.map((r, i) => `[${i}] ${r.sterren}★ (${r.datum}): ${r.tekst || "(geen tekst)"}`).join("\n");
  const conc = pa.concurrenten.map((c) => `- ${c.naam}: ${toon(c.sterren)}★, ${toon(c.reviews)} reviews, ${toon(c.fotos)} foto's, categorie ${c.categorie}`).join("\n");
  const missen = pa.checks.filter((c) => c.ok === false).map((c) => `- ${c.label}: ${c.uitleg}`).join("\n");
  const s = i.profiel;
  return `BEDRIJF: ${s.naam} (${s.website})
Waar het bedrijf over gaat: ${s.onderwerp || "-"}
Doelgroep: ${s.doelgroep || "-"}
Schrijfstijl: ${s.toon || "vriendelijk en deskundig"}
Taal: ${s.taal}

PROFIEL: ${d.naam}, ${d.adres} (plaats: ${plaats})
Hoofdcategorie: ${d.categorie}; extra: ${d.extra.join(", ") || "geen"}
Huidige beschrijving (${d.beschrijving.length} tekens): ${d.beschrijving || "(leeg)"}
Sterren: ${toon(d.sterren)} uit ${d.reviews} reviews. Waar reviews over gaan: ${Object.entries(d.themas).map(([k, v]) => `${k} (${v})`).join(", ") || "-"}
Telefoon: ${d.telefoon}

WAT ONTBREEKT OF BETER KAN:
${missen || "-"}

CONCURRENTEN DIE BOVEN DIT PROFIEL STAAN:
${conc || "-"}

ONBEANTWOORDE REVIEWS MET 3 STERREN OF MINDER:
${open || "(geen)"}`;
}

const REGELS = `Je bent een specialist in lokale SEO en Google Bedrijfsprofielen. Je schrijft voor een echt bedrijf; verzin geen feiten, merken, prijzen, acties of jaartallen die niet in de invoer staan.

Geef ALLEEN JSON terug, precies in deze vorm:
{
  "beschrijving": "...",
  "berichten": ["...", "...", "..."],
  "review_antwoorden": [{"index": 0, "antwoord": "..."}],
  "observaties": ["...", "..."]
}

Regels:
- beschrijving: maximaal 700 tekens, in de schrijfstijl van het bedrijf. Noem de plaats, wat de winkel verkoopt en doet, en waarom klanten er komen. Geen links, geen telefoonnummers, geen prijzen of tijdelijke acties (dat staat Google niet toe in de beschrijving). Gebruik de huidige beschrijving als bron, maar haal verouderde informatie weg.
- berichten: 3 Google-berichten van 60 tot 120 woorden, elk over een ander onderwerp dat past bij deze vestiging (bijvoorbeeld advies, onderhoud, proefrit). Eindig met een concrete uitnodiging (langskomen, afspraak maken). Geen verzonnen acties.
- review_antwoorden: voor elke onbeantwoorde review één antwoord (index = het nummer tussen [ ]). Kort (40 tot 90 woorden), persoonlijk, zonder standaardzinnen; erken het punt, verdedig je niet, en nodig uit om contact op te nemen met de vestiging (gebruik het telefoonnummer uit de invoer). Onderteken met "Team {{naam}}".
- observaties: maximaal 4 korte, concrete punten die opvallen en NIET al in "wat ontbreekt" staan (bijvoorbeeld een terugkerende klacht in reviews, of iets wat concurrenten duidelijk beter doen). Leeg laten mag.`;

export async function schrijfTeksten(i: Instellingen, pa: ProfielAnalyse, plaats: string): Promise<Teksten> {
  const naam = pa.data?.naam || i.profiel.naam;
  const r = await json<{ beschrijving?: string; berichten?: string[]; review_antwoorden?: { index: number; antwoord: string }[]; observaties?: string[] }>(
    i.ai.sleutel,
    i.ai.tekstmodel,
    [
      { role: "system", content: REGELS.replace("{{naam}}", naam) },
      { role: "user", content: invoer(i, pa, plaats) },
    ],
    4000
  );
  return {
    beschrijving: (r.beschrijving ?? "").trim().slice(0, 750),
    berichten: (r.berichten ?? []).map((b) => b.trim()).filter(Boolean).slice(0, 4),
    review_antwoorden: (r.review_antwoorden ?? [])
      .filter((x) => pa.reviews.open[x.index] && x.antwoord?.trim())
      .map((x) => ({ review: pa.reviews.open[x.index].tekst || `${pa.reviews.open[x.index].sterren}★ zonder tekst`, antwoord: x.antwoord.trim() })),
    observaties: (r.observaties ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 4),
  };
}

// Plaatsnaam uit een Nederlands adres ("Zilverstraat 6, 1811 DH Alkmaar" → "Alkmaar").
export function plaatsUit(adres: string): string {
  return /\d{4}\s?[A-Z]{2}\s+(.+)$/.exec(adres)?.[1]?.trim() ?? adres.split(",").pop()?.trim() ?? "";
}
