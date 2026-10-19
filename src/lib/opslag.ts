import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
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
