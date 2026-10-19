import { randomUUID } from "node:crypto";
import { json } from "./ai";
import { bewaarKansen, log } from "./opslag";
import { plek } from "./plek";
import { score } from "./score";
import { leesSite } from "./site";
import type { Bedoeling, Gat, Instellingen, Kans, Kansenrapport } from "./types";
import { heeftDfs, metCijfers, suggesties, type Zoekwoord } from "./zoekwoorden";

const BEDOELINGEN: Bedoeling[] = ["weten", "vergelijken", "kopen", "vinden"];
const GATEN: Gat[] = ["nieuw", "aanvullen", "gedekt"];

type AiKans = Omit<Kans, "id" | "volume" | "moeilijkheid" | "score" | "blogId">;

// De hele analyse: site lezen → kernzoektermen → Google-suggesties (+ DataForSEO) → AI kiest kansen en schrijft briefs → score.
export async function analyseerKansen(i: Instellingen): Promise<Kansenrapport> {
  const { profiel, ai } = i;
  const { paginas } = await leesSite(profiel.website, 25);
  const bestaand = await (plek(i.koppeling)?.berichten() ?? Promise.resolve([])).catch(() => []);

  // 1. Kernzoektermen: waarmee zou een klant dit bedrijf zoeken?
  const { kernen } = await json<{ kernen: string[] }>(
    ai.sleutel,
    ai.tekstmodel,
    [
      {
        role: "system",
        content: `Bedenk de zoektermen waarmee potentiële klanten in Google naar dit soort bedrijf zoeken.
Regels: 8 tot 10 termen, 1 tot 3 woorden, in het ${profiel.taal}, in de woorden van de klant (niet van het bedrijf), mix van producten/diensten, problemen en vragen. Geen merknaam van het bedrijf zelf.
Antwoord alleen met JSON: {"kernen": ["…"]}`,
      },
      {
        role: "user",
        content: `Bedrijf: ${profiel.naam}\nWat het doet: ${profiel.onderwerp}\nDoelgroep: ${profiel.doelgroep}\nPagina's:\n${paginas
          .slice(0, 25)
          .map((p) => `- ${p.titel} (${p.url})`)
          .join("\n")}`,
      },
    ],
    1200
  );
  const kern = (kernen ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean);
  if (!kern.length) throw new Error("Er kwamen geen zoektermen terug. Probeer het opnieuw.");

  // 2. Echte zoekwoorden erbij.
  const sug = await suggesties(kern, profiel.taal);
  let cijfers = new Map<string, Zoekwoord>();
  let melding: string | null = sug.antwoorden / Math.max(1, sug.vragen) < 0.25 ? "Google gaf weinig suggesties terug (soms tijdelijk geblokkeerd)." : null;
  const gemeten = heeftDfs(i.dfs);
  if (gemeten) {
    try {
      cijfers = await metCijfers(i.dfs, kern, sug.termen, profiel.taal);
    } catch (e) {
      melding = `Zoekvolumes ophalen lukte niet: ${e instanceof Error ? e.message : e} De analyse gaat verder zonder cijfers.`;
    }
  }
  const metData = gemeten && cijfers.size > 0;
  const alle = new Map<string, Zoekwoord>();
  for (const t of sug.termen) alle.set(t, cijfers.get(t) ?? { term: t, volume: null, moeilijkheid: null, cpc: null });
  for (const [t, z] of cijfers) alle.set(t, z);
  // Meer dan 150 is te veel voor de AI: neem de termen met vraag, en vul aan met de langere (specifiekere) termen.
  const lijst = [...alle.values()]
    .filter((z) => z.volume !== 0)
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1) || b.term.split(" ").length - a.term.split(" ").length)
    .slice(0, 150);

  // 3. De AI kiest de kansen en schrijft per kans een brief. Scores rekenen we zelf.
  const uit = await json<{ themas: { naam: string; uitleg: string }[]; kansen: AiKans[] }>(
    ai.sleutel,
    ai.tekstmodel,
    [
      {
        role: "system",
        content: `Je bent SEO-strateeg voor ${profiel.naam}. Je krijgt de pagina's van de site, de blogs die er al staan en een lijst echte zoekwoorden${metData ? " met maandelijks zoekvolume (vol) en moeilijkheid 0-100 (kd)" : ""}.

Opdracht:
1. Verdeel de relevante zoekwoorden in 4 tot 6 thema's.
2. Kies 12 tot 16 blogkansen. Elk heeft één zoekwoord letterlijk uit de lijst.
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

Kies alleen onderwerpen die dit bedrijf geloofwaardig en nuttig kan behandelen en waar een lezer klant kan worden. Sla over: concurrenten, vacatures, plaatsen waar het bedrijf niet zit, vage of heel algemene termen waar grote sites altijd winnen. Liever specifiek (2 tot 5 woorden) dan breed.
Antwoord alleen met JSON: {"themas":[{"naam":"…","uitleg":"…"}],"kansen":[{"zoekwoord":"…","thema":"…","bedoeling":"…","gat":"…","bestaandePagina":null,"waarom":"…","titelIdee":"…","invalshoek":"…","opbouw":["…"],"verwant":["…"]}]}`,
      },
      {
        role: "user",
        content: `Bedrijf: ${profiel.naam} — ${profiel.onderwerp}\nDoelgroep: ${profiel.doelgroep}\n\nPAGINA'S:\n${paginas
          .map((p) => `- ${p.url} — ${p.titel}${p.beschrijving ? ` :: ${p.beschrijving}` : ""}`)
          .join("\n")}\n\nBLOGS DIE ER AL STAAN:\n${bestaand.map((b) => `- ${b.titel}`).join("\n") || "(geen)"}\n\nZOEKWOORDEN:\n${lijst
          .map((z) => [z.term, z.volume !== null ? `vol=${z.volume}` : "", z.moeilijkheid !== null ? `kd=${z.moeilijkheid}` : ""].filter(Boolean).join(" | "))
          .join("\n")}`,
      },
    ],
    14000
  );
  if (!uit.kansen?.length) throw new Error("De analyse leverde geen kansen op. Probeer het opnieuw.");

  const kansen: Kans[] = uit.kansen
    .filter((k) => k.zoekwoord?.trim())
    .map((k) => {
      const z = alle.get(k.zoekwoord.toLowerCase().trim());
      const bedoeling = BEDOELINGEN.includes(k.bedoeling) ? k.bedoeling : "weten";
      const gat = GATEN.includes(k.gat) ? k.gat : "nieuw";
      return {
        ...k,
        id: randomUUID(),
        zoekwoord: k.zoekwoord.toLowerCase().trim(),
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

  const rapport: Kansenrapport = {
    gemaakt: new Date().toISOString(),
    bron: metData ? "dataforseo" : "google",
    paginas: paginas.length,
    zoekwoorden: alle.size,
    themas: uit.themas ?? [],
    kansen,
    melding,
  };
  await bewaarKansen(rapport);
  await log("analyse", `${kansen.length} kansen uit ${alle.size} zoekwoorden (${metData ? "met zoekvolumes" : "zonder zoekvolumes"})`);
  return rapport;
}
