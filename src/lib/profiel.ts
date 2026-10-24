import { json } from "./ai";
import { haal, herkenCms, leesSite, normaal, sectiesVan } from "./site";
import type { AiInstellingen, Cms, Profiel } from "./types";

// Stap 1 van de wizard: de website lezen en er een bedrijfsprofiel en schrijfstijl uit afleiden.
export interface Websiteanalyse {
  profiel: Profiel;
  cms: Cms;
  paginas: number;
  blogs: { titel: string; url: string }[];
}

const BLOGPAD = /\/(blog|blogs|nieuws|news|artikel|artikelen|kennisbank|advies|tips|inspiratie|verhalen)\//i;

export async function analyseerWebsite(adres: string, ai: AiInstellingen): Promise<Websiteanalyse> {
  const website = normaal(adres);
  const home = await haal(website, 20_000);
  if (!home) throw new Error(`We kunnen ${website} niet openen. Klopt het adres en is de site online?`);
  const cms = herkenCms(home.html, home.kop);

  const { paginas, alleUrls, menu } = await leesSite(website, 14);
  const secties = sectiesVan(alleUrls);
  const blogs = alleUrls
    .filter((u) => BLOGPAD.test(u))
    .slice(0, 12)
    .map((url) => ({ url, titel: paginas.find((p) => p.url === url)?.titel ?? decodeURIComponent(url.split("/").filter(Boolean).pop() ?? "").replace(/-/g, " ") }));

  // De pagina's met de meeste tekst zeggen het meest over het bedrijf en de toon.
  const fragmenten = [...paginas]
    .sort((a, b) => b.woorden - a.woorden)
    .slice(0, 6)
    .map((p) => `# ${p.titel || p.url}\n${p.tekst.slice(0, 1800)}`)
    .join("\n\n");

  const uit = await json<Partial<Profiel>>(
    ai.sleutel,
    ai.tekstmodel,
    [
      {
        role: "system",
        content: `Je analyseert de website van een bedrijf zodat een schrijver daarna blogs kan maken die klinken alsof het bedrijf ze zelf schreef.
Geef alleen een JSON-object terug met deze velden:
- "naam": de bedrijfs- of merknaam zoals die op de site staat
- "onderwerp": in één of twee zinnen wat het bedrijf doet en verkoopt, en waar
- "doelgroep": voor wie het bedrijf er is, kort
- "taal": de taal van de site
- "auteur": hoe blogs ondertekend kunnen worden, bijvoorbeeld "Team <naam>"
- "aanbod": de productgroepen en diensten die het bedrijf aanbiedt, met komma's gescheiden, in de woorden van een klant en in het enkelvoud of zoals men zoekt ("bakfiets, e-bike, fatbike, kinderfiets, werkplaats"). Haal ze uit het menu en de secties van de site; neem alle groepen mee, ook de kleine. Geen merknamen, geen plaatsnamen, geen "contact" of "over ons".
- "toon": een schrijfopdracht van hooguit 120 woorden: spreekt de site de lezer aan met u of je, hoe lang zijn de zinnen, hoe formeel, welke woorden en voorbeelden komen terug, wat moet een schrijver vermijden. Schrijf het als instructie, niet als beschrijving.`,
      },
      {
        role: "user",
        content: `Website: ${website}\n\nMENU: ${menu.join(" · ") || "(niet gevonden)"}\n\nSECTIES UIT DE SITEMAP:\n${secties.map((s) => `- ${s.sectie}: ${s.items.join(", ")}`).join("\n") || "(geen)"}\n\n${fragmenten || home.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 5000)}`,
      },
    ],
    1600
  );

  return {
    profiel: {
      website,
      naam: (uit.naam ?? "").trim(),
      onderwerp: (uit.onderwerp ?? "").trim(),
      doelgroep: (uit.doelgroep ?? "").trim(),
      toon: (uit.toon ?? "").trim(),
      taal: (uit.taal ?? "Nederlands").trim() || "Nederlands",
      auteur: (uit.auteur ?? "").trim(),
      extra: "",
      aanbod: (uit.aanbod ?? "").trim(),
    },
    cms,
    paginas: paginas.length,
    blogs,
  };
}
