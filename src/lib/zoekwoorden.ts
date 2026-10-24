import type { DataForSeo } from "./types";

// Zoekwoorden verzamelen: echte Google-suggesties, en met DataForSEO ook zoekvolume, moeilijkheid en klikprijs.
export interface Zoekwoord {
  term: string;
  volume: number | null;
  moeilijkheid: number | null; // 0-100
  cpc: number | null;
  bron?: string; // de kernterm (productgroep) waar dit zoekwoord uit voortkwam
}

const taalcode = (taal: string) => (/^(ned|dutch|nl)/i.test(taal) ? "nl" : /^(dui|ger|de)/i.test(taal) ? "de" : "en");
const pauze = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Varianten waarmee mensen in de praktijk zoeken: kosten, vergelijken, ervaringen, vragen.
const VOOR: Record<string, string[]> = {
  nl: ["wat kost", "welke", "hoe", "verschil", "beste"],
  de: ["was kostet", "welche", "wie", "unterschied", "beste"],
  en: ["how much", "which", "how to", "difference", "best"],
};
const ACHTER: Record<string, string[]> = {
  nl: ["kopen", "of", "ervaringen", "vergelijken", "tips", "onderhoud"],
  de: ["kaufen", "oder", "erfahrungen", "vergleich", "tipps", "wartung"],
  en: ["buy", "vs", "reviews", "compare", "tips", "maintenance"],
};

async function google(vraag: string, hl: string): Promise<string[]> {
  try {
    const res = await fetch(`https://www.google.com/complete/search?client=chrome&hl=${hl}&gl=${hl === "en" ? "us" : hl}&q=${encodeURIComponent(vraag)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

// Google-suggesties voor alle kerntermen (tot 16); de eerste 10 ook met voor- en achtervoegsels.
// bron: per gevonden term de kernterm waar hij vandaan komt, zodat de analyse elke productgroep kan laten meetellen.
export async function suggesties(kernen: string[], taal: string): Promise<{ termen: string[]; bron: Map<string, string>; antwoorden: number; vragen: number }> {
  const hl = taalcode(taal);
  const vragen = kernen.slice(0, 16).flatMap((k, i) => [
    { v: k, k },
    ...(i < 10 ? VOOR[hl].map((v) => ({ v: `${v} ${k}`, k })) : []),
    ...(i < 10 ? ACHTER[hl].map((a) => ({ v: `${k} ${a}`, k })) : []),
  ]);
  const bron = new Map<string, string>(kernen.map((k) => [k.toLowerCase(), k.toLowerCase()]));
  let antwoorden = 0;
  for (let i = 0; i < vragen.length; i += 4) {
    const deel = vragen.slice(i, i + 4);
    const lijsten = await Promise.all(deel.map((x) => google(x.v, hl)));
    lijsten.forEach((l, j) => {
      if (l.length) antwoorden++;
      l.forEach((t) => {
        const term = t.toLowerCase().trim();
        if (term.length > 3 && term.length < 70 && !bron.has(term)) bron.set(term, deel[j].k.toLowerCase());
      });
    });
    await pauze(300); // rustig aan, anders geeft Google lege lijsten
  }
  return { termen: [...bron.keys()], bron, antwoorden, vragen: vragen.length };
}

/* ------------------------------ DataForSEO ------------------------------ */

export const heeftDfs = (d: DataForSeo) => !!(d.login.trim() && d.wachtwoord.trim());

async function dfs<T>(d: DataForSeo, pad: string, taak: Record<string, unknown>, kosten?: { totaal: number }): Promise<T[]> {
  const res = await fetch(`https://api.dataforseo.com/v3/${pad}`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${d.login.trim()}:${d.wachtwoord.trim()}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify([taak]),
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 401) throw new Error("DataForSEO kent deze API-login of dit API-wachtwoord niet.");
  if (res.status === 402) throw new Error("Het tegoed bij DataForSEO is op.");
  const body = (await res.json()) as { status_code?: number; status_message?: string; cost?: number; tasks?: { status_code?: number; status_message?: string; result?: T[] }[] };
  const t = body.tasks?.[0];
  if (body.status_code !== 20000 || (t?.status_code ?? 0) >= 40000) throw new Error(`DataForSEO: ${t?.status_message ?? body.status_message ?? "onbekende fout"}`);
  if (kosten && typeof body.cost === "number") kosten.totaal += body.cost;
  return t?.result ?? [];
}

const plek = (taal: string) => (taalcode(taal) === "nl" ? { location_code: 2528, language_code: "nl" } : taalcode(taal) === "de" ? { location_code: 2276, language_code: "de" } : { location_code: 2840, language_code: "en" });

// Gerelateerde zoekwoorden per kernterm (met volume en moeilijkheid), plus volume voor de Google-suggesties.
// Elke kernterm (productgroep) wordt uitgebreid, tot 14, drie tegelijk; zo komt een kleinere groep (zoals fatbikes) niet in de knel
// naast de grote (zoals e-bikes). Kosten: ±$0,01 per kernterm en ±$0,05 voor de volumes van de suggesties.
export async function metCijfers(d: DataForSeo, kernen: string[], termen: string[], taal: string): Promise<{ cijfers: Map<string, Zoekwoord>; kosten: number }> {
  const uit = new Map<string, Zoekwoord>();
  const kosten = { totaal: 0 };
  type Item = { keyword: string; keyword_info?: { search_volume?: number; cpc?: number }; keyword_properties?: { keyword_difficulty?: number } };
  const lijst = kernen.slice(0, 14);
  const perKern = new Map<string, Item[]>();
  for (let i = 0; i < lijst.length; i += 3) {
    await Promise.all(
      lijst.slice(i, i + 3).map(async (k) => {
        const r = await dfs<{ items?: Item[] }>(d, "dataforseo_labs/google/keyword_suggestions/live", { ...plek(taal), keyword: k, limit: 60, include_seed_keyword: true }, kosten);
        perKern.set(k, r[0]?.items ?? []);
      })
    );
  }
  for (const k of lijst) {
    for (const it of perKern.get(k) ?? []) {
      const term = it.keyword.toLowerCase();
      if (uit.has(term)) continue;
      const kd = it.keyword_properties?.keyword_difficulty;
      uit.set(term, { term, volume: it.keyword_info?.search_volume ?? null, moeilijkheid: kd ? kd : null, cpc: it.keyword_info?.cpc ?? null, bron: k.toLowerCase() });
    }
  }
  const zonder = termen.filter((t) => !uit.has(t)).slice(0, 700);
  if (zonder.length) {
    const r = await dfs<{ keyword: string; search_volume?: number; cpc?: number }>(d, "keywords_data/google_ads/search_volume/live", { ...plek(taal), keywords: zonder }, kosten);
    for (const it of r) uit.set(it.keyword.toLowerCase(), { term: it.keyword.toLowerCase(), volume: it.search_volume ?? null, moeilijkheid: null, cpc: it.cpc ?? null });
  }
  return { cijfers: uit, kosten: Math.round(kosten.totaal * 10_000) / 10_000 };
}

// Saldo opvragen (gratis), voor de Instellingen-pagina.
export async function dfsSaldo(d: DataForSeo): Promise<number | null> {
  const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
    headers: { Authorization: `Basic ${Buffer.from(`${d.login.trim()}:${d.wachtwoord.trim()}`).toString("base64")}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error("DataForSEO kent deze API-login of dit API-wachtwoord niet.");
  const b = (await res.json()) as { tasks?: { result?: { money?: { balance?: number } }[] }[] };
  return b.tasks?.[0]?.result?.[0]?.money?.balance ?? null;
}
