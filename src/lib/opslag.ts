import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LokaalAnalyse, Vestiging } from "./lokaal";
import type { Blog, Instellingen, Kansenrapport, Logregel } from "./types";

// Lokale opslag: kleine JSON-bestanden in data/. Geen database nodig; de gebruiker kan de map zelf back-uppen.
const MAP = path.join(process.cwd(), "data");
export const BEELDEN = path.join(MAP, "beelden");

async function lees<T>(bestand: string, standaard: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(MAP, bestand), "utf8")) as T;
  } catch {
    return standaard;
  }
}

// Eerst naar een tijdelijk bestand en dan hernoemen, zodat een afgebroken schrijfactie nooit een half bestand achterlaat.
async function schrijf(bestand: string, data: unknown) {
  await mkdir(MAP, { recursive: true });
  const doel = path.join(MAP, bestand);
  const tijdelijk = `${doel}.${process.pid}.tmp`;
  await writeFile(tijdelijk, JSON.stringify(data, null, 2), "utf8");
  await rename(tijdelijk, doel);
  // Alleen de eigenaar van de computer kan de sleutels lezen.
  if (bestand === "instellingen.json") await chmod(doel, 0o600).catch(() => {});
}

export const LEEG: Instellingen = {
  klaar: false,
  dfs: { login: "", wachtwoord: "" },
  profiel: { website: "", naam: "", onderwerp: "", doelgroep: "", toon: "", taal: "Nederlands", auteur: "", extra: "" },
  koppeling: { cms: "geen" },
  ai: { sleutel: "", tekstmodel: "anthropic/claude-opus-5.5", beeldmodel: "openai/gpt-5.4-image-2", beeldstijl: "" },
  opmaak: { plugin: false, ctas: ["advies", "afspraak", "contact"] },
  bijgewerkt: "",
};

export async function instellingen(): Promise<Instellingen> {
  const i = await lees<Partial<Instellingen>>("instellingen.json", {});
  return {
    ...LEEG,
    ...i,
    profiel: { ...LEEG.profiel, ...i.profiel },
    koppeling: { ...LEEG.koppeling, ...i.koppeling },
    ai: { ...LEEG.ai, ...i.ai },
    opmaak: { ...LEEG.opmaak, ...i.opmaak },
    dfs: { ...LEEG.dfs, ...i.dfs },
  };
}

export async function bewaarInstellingen(wijziging: Partial<Instellingen>): Promise<Instellingen> {
  const nu = await instellingen();
  const nieuw: Instellingen = {
    ...nu,
    ...wijziging,
    profiel: { ...nu.profiel, ...wijziging.profiel },
    koppeling: { ...nu.koppeling, ...wijziging.koppeling },
    ai: { ...nu.ai, ...wijziging.ai },
    opmaak: { ...nu.opmaak, ...wijziging.opmaak },
    dfs: { ...nu.dfs, ...wijziging.dfs },
    bijgewerkt: new Date().toISOString(),
  };
  await schrijf("instellingen.json", nieuw);
  return nieuw;
}

/* ------------------------------ blogs ------------------------------ */

export async function blogs(): Promise<Blog[]> {
  return (await lees<Blog[]>("blogs.json", [])).sort((a, b) => b.gemaakt.localeCompare(a.gemaakt));
}

export async function blog(id: string): Promise<Blog | null> {
  return (await blogs()).find((b) => b.id === id) ?? null;
}

export async function nieuweBlog(velden: Partial<Blog> & Pick<Blog, "onderwerp">): Promise<Blog> {
  const b: Blog = {
    id: randomUUID(),
    zoekwoord: velden.onderwerp,
    titel: "",
    adres: "",
    intro: "",
    tekst: "",
    meta: "",
    categorie: "",
    tags: [],
    beeld: null,
    beeldPrompt: "",
    status: "concept",
    bron: "zelf",
    cmsId: null,
    geplandVoor: null,
    liveOp: null,
    liveUrl: null,
    fout: null,
    gemaakt: new Date().toISOString(),
    ...velden,
  };
  await schrijf("blogs.json", [...(await lees<Blog[]>("blogs.json", [])), b]);
  return b;
}

export async function wijzigBlog(id: string, wijziging: Partial<Blog>): Promise<Blog> {
  const lijst = await lees<Blog[]>("blogs.json", []);
  const i = lijst.findIndex((b) => b.id === id);
  if (i < 0) throw new Error("Blog niet gevonden");
  lijst[i] = { ...lijst[i], ...wijziging, id };
  await schrijf("blogs.json", lijst);
  return lijst[i];
}

export async function verwijderBlog(id: string) {
  await schrijf("blogs.json", (await lees<Blog[]>("blogs.json", [])).filter((b) => b.id !== id));
}

/* ------------------------------ lokaal (bedrijfsprofielen) ------------------------------ */

export const profielen = () => lees<Vestiging[]>("profielen.json", []);

export async function voegProfielToe(p: Omit<Vestiging, "id" | "aangemaakt">): Promise<Vestiging> {
  const lijst = await profielen();
  if (lijst.some((x) => x.cid === p.cid)) throw new Error("Dit profiel staat er al bij.");
  const nieuw: Vestiging = { ...p, id: randomUUID(), aangemaakt: new Date().toISOString() };
  await schrijf("profielen.json", [...lijst, nieuw]);
  return nieuw;
}

export async function wijzigProfiel(id: string, w: Partial<Pick<Vestiging, "pagina_url" | "zoekwoorden" | "naam">>) {
  const lijst = await profielen();
  const i = lijst.findIndex((p) => p.id === id);
  if (i < 0) throw new Error("Profiel niet gevonden");
  lijst[i] = { ...lijst[i], ...w };
  await schrijf("profielen.json", lijst);
}

export const verwijderProfiel = async (id: string) => schrijf("profielen.json", (await profielen()).filter((p) => p.id !== id));

// De laatste 12 analyses blijven bewaard (nieuwste eerst), zodat je later kunt vergelijken.
export const lokaalAnalyse = async () => (await lees<LokaalAnalyse[]>("lokaal.json", []))[0] ?? null;

export async function bewaarLokaal(a: LokaalAnalyse): Promise<LokaalAnalyse> {
  const lijst = await lees<LokaalAnalyse[]>("lokaal.json", []);
  const met = a.id ? a : { ...a, id: randomUUID() };
  const rest = lijst.filter((x) => x.id !== met.id);
  await schrijf("lokaal.json", [met, ...rest].slice(0, 12));
  return met;
}

// Wat je met de suggesties van Los alles op hebt gedaan (gedaan / overgeslagen), plus je eigen aanpassingen aan de tekst.
export type SuggestieStand = Record<string, { status?: "open" | "gedaan" | "overgeslagen"; tekst?: string }>;
export const suggestieStand = () => lees<SuggestieStand>("lokaal-suggesties.json", {});

export async function zetSuggestie(id: string, w: { status?: "open" | "gedaan" | "overgeslagen"; tekst?: string }) {
  const nu = await suggestieStand();
  nu[id] = { ...nu[id], ...w };
  await schrijf("lokaal-suggesties.json", nu);
  return nu;
}

/* ------------------------------ kansen + logboek ------------------------------ */

export const kansenrapport = () => lees<Kansenrapport | null>("kansen.json", null);
export const bewaarKansen = (r: Kansenrapport) => schrijf("kansen.json", r);

export async function logboek(aantal = 30): Promise<Logregel[]> {
  return (await lees<Logregel[]>("logboek.json", [])).slice(-aantal).reverse();
}

export async function log(soort: Logregel["soort"], tekst: string) {
  const lijst = await lees<Logregel[]>("logboek.json", []);
  lijst.push({ tijd: new Date().toISOString(), soort, tekst });
  await schrijf("logboek.json", lijst.slice(-500));
}
