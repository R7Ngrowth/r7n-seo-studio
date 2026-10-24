import { randomUUID } from "node:crypto";
import { json } from "./ai";
import { bewaarKansen, log } from "./opslag";
import { plek } from "./plek";
import { score } from "./score";
import { leesSite, sectiesVan } from "./site";
import type { Bedoeling, Gat, Groep, Instellingen, Kans, Kansenrapport } from "./types";
import { heeftDfs, metCijfers, suggesties, type Zoekwoord } from "./zoekwoorden";

const BEDOELINGEN: Bedoeling[] = ["weten", "vergelijken", "kopen", "vinden"];
const GATEN: Gat[] = ["nieuw", "aanvullen", "gedekt"];

type AiKans = Omit<Kans, "id" | "volume" | "moeilijkheid" | "score" | "blogId">;
type AiGroep = { naam: string; term: string };

const net = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
export const aanbodLijst = (aanbod?: string) => [...new Set((aanbod ?? "").split(/[,\n;]/).map(net).filter(Boolean))].slice(0, 20);

// De hele analyse: site lezen → productgroepen en kernzoektermen → Google-suggesties (+ DataForSEO) → AI kiest kansen en schrijft briefs → score.
// Elke productgroep van de site (en wat jij bij Aanbod toevoegt) wordt apart onderzocht en krijgt kansen; zo blijft een kleinere groep
// (fatbikes) niet onzichtbaar naast een grote (e-bikes).
export async function analyseerKansen(i: Instellingen): Promise<Kansenrapport> {
  const { profiel, ai } = i;
  const { paginas, alleUrls, menu } = await leesSite(profiel.website, 40);
  const secties = sectiesVan(alleUrls);
  const eigen = aanbodLijst(profiel.aanbod);
  const bestaand = await (plek(i.koppeling)?.berichten() ?? Promise.resolve([])).catch(() => []);

  // 1. Productgroepen en kernzoektermen: waarmee zou een klant dit bedrijf zoeken, per groep?
  const stap1 = await json<{ groepen: AiGroep[]; vragen: string[] }>(
    ai.sleutel,
    ai.tekstmodel,
    [
      {
        role: "system",
        content: `Je krijgt het menu, de secties en de pagina's van een website, plus wat het bedrijf zelf als aanbod opgeeft.

Opdracht, antwoord alleen met JSON {"groepen":[{"naam":"…","term":"…"}],"vragen":["…"]}:
1. "groepen": ELKE productgroep of dienst die dit bedrijf aanbiedt, ook de kleine. Per groep: "naam" zoals de site hem noemt en "term" als zoekterm van 1 tot 3 woorden in het ${profiel.taal}, in de woorden van een klant (enkelvoud zoals men zoekt: "fatbike", "bakfiets", "e-bike"). Maximaal 14 groepen. Alles wat onder EIGEN AANBOD staat moet een eigen groep krijgen, ook als het niet op de site staat.
   Sla over: merken, plaatsen en vestigingen, contact, over ons, vacatures, privacy, cadeaubonnen, algemene verzamelpagina's ("alle fietsen").
2. "vragen": 4 tot 6 zoektermen voor problemen en vragen waar de klanten van dit bedrijf mee zitten, 1 tot 3 woorden, in het ${profiel.taal}. Geen merknaam van het bedrijf.`,
      },
      {
        role: "user",
        content: `Bedrijf: ${profiel.naam}\nWat het doet: ${profiel.onderwerp}\nDoelgroep: ${profiel.doelgroep}\nEIGEN AANBOD (door het bedrijf opgegeven): ${eigen.join(", ") || "(niets opgegeven)"}\n\nMENU: ${menu.join(" · ") || "(niet gevonden)"}\n\nSECTIES UIT DE SITEMAP:\n${secties.map((s) => `- ${s.sectie}: ${s.items.join(", ")}`).join("\n") || "(geen)"}\n\nPAGINA'S:\n${paginas
          .slice(0, 40)
          .map((p) => `- ${p.titel} (${p.url})`)
          .join("\n")}`,
      },
    ],
    1600
  );
  const groepen: AiGroep[] = [];
  const gezien = new Set<string>();
  for (const g of stap1.groepen ?? []) {
    const term = net(g.term ?? "");
    if (!term || gezien.has(term)) continue;
    gezien.add(term);
    groepen.push({ naam: (g.naam ?? term).trim() || term, term });
  }
  // Wat jij zelf opgaf komt er altijd in, ook als het model het oversloeg.
  for (const e of eigen) if (![...gezien].some((t) => t === e || t.includes(e) || e.includes(t))) {
    gezien.add(e);
    groepen.push({ naam: e.charAt(0).toUpperCase() + e.slice(1), term: e });
  }
  const vragen = (stap1.vragen ?? []).map(net).filter((v) => v && !gezien.has(v)).slice(0, 6);
  const kern = [...groepen.slice(0, 14).map((g) => g.term), ...vragen];
  if (!kern.length) throw new Error("Er kwamen geen zoektermen terug. Probeer het opnieuw.");
  const isEigen = (term: string) => eigen.some((e) => e === term || term.includes(e) || e.includes(term));

  // 2. Echte zoekwoorden erbij: Google-suggesties voor alles, DataForSEO per productgroep.
  const sug = await suggesties(kern, profiel.taal);
  let cijfers = new Map<string, Zoekwoord>();
  let kosten = 0;
  let melding: string | null = sug.antwoorden / Math.max(1, sug.vragen) < 0.25 ? "Google gaf weinig suggesties terug (soms tijdelijk geblokkeerd)." : null;
  const gemeten = heeftDfs(i.dfs);
  if (gemeten) {
    try {
      const r = await metCijfers(i.dfs, kern, sug.termen, profiel.taal);
      cijfers = r.cijfers;
      kosten = r.kosten;
    } catch (e) {
      melding = `Zoekvolumes ophalen lukte niet: ${e instanceof Error ? e.message : e} De analyse gaat verder zonder cijfers.`;
    }
  }
  const metData = gemeten && cijfers.size > 0;
  const alle = new Map<string, Zoekwoord>();
  for (const t of sug.termen) alle.set(t, { term: t, volume: null, moeilijkheid: null, cpc: null, bron: sug.bron.get(t) });
  for (const [t, z] of cijfers) alle.set(t, { ...z, bron: z.bron ?? sug.bron.get(t) ?? alle.get(t)?.bron });

  // Per groep de beste zoekwoorden, dan aanvullen met de rest: zo staat elke productgroep in de lijst voor de AI.
  const opVolume = (a: Zoekwoord, b: Zoekwoord) => (b.volume ?? -1) - (a.volume ?? -1) || b.term.split(" ").length - a.term.split(" ").length;
  const bruikbaar = [...alle.values()].filter((z) => z.volume !== 0);
  const perGroep = new Map<string, Zoekwoord[]>();
  for (const z of bruikbaar) {
    const b = z.bron ?? "";
    if (!perGroep.has(b)) perGroep.set(b, []);
    perGroep.get(b)!.push(z);
  }
  const gekozen = new Set<string>();
  const lijst: Zoekwoord[] = [];
  for (const k of kern) {
    for (const z of (perGroep.get(k) ?? []).sort(opVolume).slice(0, 12)) {
      gekozen.add(z.term);
      lijst.push(z);
    }
  }
  for (const z of bruikbaar.sort(opVolume)) {
    if (lijst.length >= 180) break;
    if (!gekozen.has(z.term)) {
      gekozen.add(z.term);
      lijst.push(z);
    }
  }
  const groepNaam = (term: string) => groepen.find((g) => g.term === term)?.naam ?? term;
  const lijstTekst = lijst
    .map((z) => [z.term, z.bron ? `groep=${groepNaam(z.bron)}` : "", z.volume !== null ? `vol=${z.volume}` : "", z.moeilijkheid !== null ? `kd=${z.moeilijkheid}` : ""].filter(Boolean).join(" | "))
    .join("\n");
  const metVraag = groepen.filter((g) => (perGroep.get(g.term) ?? []).some((z) => z.volume === null || z.volume > 0));

  // 3. De AI kiest de kansen en schrijft per kans een brief. Scores rekenen we zelf.
  const uit = await json<{ themas: { naam: string; uitleg: string }[]; kansen: AiKans[] }>(
    ai.sleutel,
    ai.tekstmodel,
    [
      {
        role: "system",
        content: `Je bent SEO-strateeg voor ${profiel.naam}. Je krijgt de pagina's van de site, de blogs die er al staan en een lijst echte zoekwoorden${metData ? " met maandelijks zoekvolume (vol) en moeilijkheid 0-100 (kd)" : ""}. Bij elk zoekwoord staat de productgroep (groep) waar het bij hoort.

Opdracht:
1. Verdeel de relevante zoekwoorden in 4 tot 8 thema's. Gebruik de productgroepen als thema's waar dat past; voeg hoogstens 2 thema's toe die over groepen heen gaan (zoals onderhoud of kiezen).
2. Kies 14 tot 20 blogkansen. Elk heeft één zoekwoord letterlijk uit de lijst. VERPLICHT: minstens één kans voor ELKE productgroep in de lijst PRODUCTGROEPEN MET ZOEKVRAAG, en hoogstens 5 kansen voor één groep. Verdeel dus over de groepen; de grootste groep krijgt niet alles.
3. Geef per kans:
   - "thema": een van je thema's
   - "bedoeling": "weten" (informatie), "vergelijken" (opties afwegen), "kopen" (klaar om te kiezen) of "vinden" (zoekt een bepaalde site)
   - "gat": "nieuw" (de site heeft hier niets over), "aanvullen" (wordt kort genoemd) of "gedekt" (staat er al goed)
   - "bestaandePagina": URL van de pagina die het al behandelt, of null
   - "waarom": één zin waarom dit iets oplevert voor dit bedrijf
   - "titelIdee": een titel die mensen willen aanklikken, in het ${profiel.taal}, in de schrijfstijl en aanspreekvorm van het bedrijf (zie hieronder)
   - "invalshoek": in één zin wat dit artikel anders of beter maakt
   - "opbouw": 4 tot 6 tussenkoppen
   - "verwant": 3 tot 6 verwante zoekwoorden uit de lijst

Schrijfstijl van het bedrijf (volg de aanspreekvorm, u of je, ook in titels, invalshoek en opbouw): ${profiel.toon}
${profiel.extra ? `Vaste wensen van het bedrijf: ${profiel.extra}\n` : ""}
Kies alleen onderwerpen die dit bedrijf geloofwaardig en nuttig kan behandelen en waar een lezer klant kan worden. Sla over: concurrenten, vacatures, plaatsen waar het bedrijf niet zit, vage of heel algemene termen waar grote sites altijd winnen. Liever specifiek (2 tot 5 woorden) dan breed.
Antwoord alleen met JSON: {"themas":[{"naam":"…","uitleg":"…"}],"kansen":[{"zoekwoord":"…","thema":"…","bedoeling":"…","gat":"…","bestaandePagina":null,"waarom":"…","titelIdee":"…","invalshoek":"…","opbouw":["…"],"verwant":["…"]}]}`,
      },
      {
        role: "user",
        content: `Bedrijf: ${profiel.naam} — ${profiel.onderwerp}\nDoelgroep: ${profiel.doelgroep}\n\nPRODUCTGROEPEN MET ZOEKVRAAG:\n${metVraag.map((g) => `- ${g.naam} (${g.term})${isEigen(g.term) ? " — door het bedrijf zelf opgegeven" : ""}`).join("\n") || "(geen)"}\n\nPAGINA'S:\n${paginas
          .map((p) => `- ${p.url} — ${p.titel}${p.beschrijving ? ` :: ${p.beschrijving}` : ""}`)
          .join("\n")}\n\nBLOGS DIE ER AL STAAN:\n${bestaand.map((b) => `- ${b.titel}`).join("\n") || "(geen)"}\n\nZOEKWOORDEN:\n${lijstTekst}`,
      },
    ],
    16000
  );
  if (!uit.kansen?.length) throw new Error("De analyse leverde geen kansen op. Probeer het opnieuw.");

  const kansen: Kans[] = uit.kansen
    .filter((k) => k.zoekwoord?.trim())
    .map((k) => {
      const z = alle.get(net(k.zoekwoord));
      const bedoeling = BEDOELINGEN.includes(k.bedoeling) ? k.bedoeling : "weten";
      const gat = GATEN.includes(k.gat) ? k.gat : "nieuw";
      return {
        ...k,
        id: randomUUID(),
        zoekwoord: net(k.zoekwoord),
        bedoeling,
        gat,
        bestaandePagina: k.bestaandePagina || null,
        opbouw: Array.isArray(k.opbouw) ? k.opbouw : [],
        verwant: Array.isArray(k.verwant) ? k.verwant : [],
        volume: z?.volume ?? null,
        moeilijkheid: z?.moeilijkheid ?? null,
        score: score({ volume: z?.volume ?? null, moeilijkheid: z?.moeilijkheid ?? null, bedoeling, gat, gemeten: metData }),
        blogId: null,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Per productgroep: hoeveel zoekwoorden en kansen, zodat je ziet wat er onderzocht is en waar weinig vraag naar is.
  const groepUit: Groep[] = groepen.slice(0, 14).map((g) => {
    const termen = perGroep.get(g.term) ?? [];
    return {
      naam: g.naam,
      term: g.term,
      zoekwoorden: termen.length,
      volume: metData ? termen.reduce((s, z) => s + (z.volume ?? 0), 0) : null,
      kansen: kansen.filter((k) => alle.get(k.zoekwoord)?.bron === g.term || k.zoekwoord.includes(g.term)).length,
      eigen: isEigen(g.term),
    };
  });

  const rapport: Kansenrapport = {
    gemaakt: new Date().toISOString(),
    bron: metData ? "dataforseo" : "google",
    paginas: paginas.length,
    zoekwoorden: alle.size,
    themas: uit.themas ?? [],
    kansen,
    melding,
    groepen: groepUit,
    kosten,
  };
  await bewaarKansen(rapport);
  await log("analyse", `${kansen.length} kansen uit ${alle.size} zoekwoorden over ${groepUit.length} productgroepen (${metData ? `met zoekvolumes, $${kosten.toFixed(2)}` : "zonder zoekvolumes"})`);
  return rapport;
}
