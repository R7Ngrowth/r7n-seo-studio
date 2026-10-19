import { leesBeeld, nieuwBeeld } from "./beeld";
import { blokkerend, kwaliteit } from "./kwaliteit";
import { blog, blogs, bewaarKansen, instellingen, kansenrapport, log, nieuweBlog, wijzigBlog } from "./opslag";
import { plek } from "./plek";
import { schrijf } from "./schrijver";
import type { Blog } from "./types";

// De handelingen van de studio: blog maken, publiceren, inplannen, terughalen.

export async function maakBlog(onderwerp: string, kansId?: string | null): Promise<Blog> {
  const i = await instellingen();
  const rapport = kansId ? await kansenrapport() : null;
  const kans = rapport?.kansen.find((k) => k.id === kansId) ?? null;
  const g = await schrijf(i, onderwerp, kans);
  let beeld: string | null = null;
  let fout: string | null = null;
  try {
    if (g.beeldPrompt) beeld = await nieuwBeeld(i.ai, g.beeldPrompt, g.adres);
  } catch (e) {
    fout = `Afbeelding lukte niet: ${e instanceof Error ? e.message : e}`;
  }
  const b = await nieuweBlog({
    onderwerp,
    zoekwoord: kans?.zoekwoord ?? onderwerp,
    bron: kans ? "kans" : "zelf",
    titel: g.titel,
    adres: g.adres,
    intro: g.intro,
    tekst: g.tekst,
    meta: g.meta,
    categorie: g.categorie,
    tags: g.tags,
    beeldPrompt: g.beeldPrompt,
    beeld,
    fout,
  });
  if (rapport && kans) {
    kans.blogId = b.id;
    await bewaarKansen(rapport);
  }
  await log("blog", `Geschreven: "${b.titel}"`);
  return b;
}

export async function opnieuwBeeld(id: string, prompt: string): Promise<Blog> {
  const [i, b] = await Promise.all([instellingen(), blog(id)]);
  if (!b) throw new Error("Blog niet gevonden");
  const bestand = await nieuwBeeld(i.ai, prompt || b.beeldPrompt || b.titel, b.adres);
  return wijzigBlog(id, { beeld: bestand, beeldPrompt: prompt || b.beeldPrompt, fout: null });
}

export async function adresVrij(b: Blog): Promise<boolean | null> {
  const p = plek((await instellingen()).koppeling);
  if (!p || !b.adres) return null;
  try {
    return await p.adresVrij(b.adres, b.cmsId);
  } catch {
    return null;
  }
}

export async function controles(b: Blog) {
  const i = await instellingen();
  return kwaliteit(b, i.profiel.website, i.koppeling.cms, i.opmaak.plugin, b.status === "live" ? null : await adresVrij(b));
}

// Naar de site: live, ingepland of als concept in het CMS.
export async function plaats(id: string, status: "live" | "gepland" | "concept", wanneer?: string): Promise<Blog> {
  const i = await instellingen();
  const b = await blog(id);
  if (!b) throw new Error("Blog niet gevonden");
  const p = plek(i.koppeling);
  if (!p) throw new Error("Er is geen automatische koppeling. Gebruik Kopiëren of koppel je site bij Instellingen.");
  if (status === "gepland" && (!wanneer || new Date(wanneer).getTime() < Date.now() + 60_000)) throw new Error("Kies een moment in de toekomst.");
  if (status !== "concept") {
    const mis = blokkerend(await controles(b));
    if (mis.length) throw new Error(`Nog niet klaar: ${mis.map((c) => `${c.label} (${c.uitleg})`).join("; ")}.`);
  }
  const r = await p.plaats(
    {
      titel: b.titel,
      tekst: b.tekst,
      intro: b.intro,
      adres: b.adres,
      categorie: b.categorie,
      tags: b.tags,
      meta: b.meta,
      beeld: b.beeld ? { data: await leesBeeld(b.beeld), mime: "image/webp", naam: b.beeld, alt: b.titel } : undefined,
      status,
      wanneer,
    },
    b.cmsId
  );
  const nieuw = await wijzigBlog(id, {
    cmsId: r.id,
    adres: r.adres || b.adres,
    liveUrl: r.url || b.liveUrl,
    status: status === "live" ? "live" : status === "gepland" ? "gepland" : "concept",
    geplandVoor: status === "gepland" ? (wanneer ?? null) : null,
    liveOp: status === "live" ? new Date().toISOString() : null,
    fout: null,
  });
  await log(
    "publicatie",
    status === "live"
      ? `Live gezet: "${b.titel}"`
      : status === "gepland"
        ? `Ingepland voor ${new Date(wanneer!).toLocaleString("nl-NL")}: "${b.titel}"`
        : `Als concept op de site gezet: "${b.titel}"`
  );
  return nieuw;
}

// Ingepland zetten de platformen zelf live; staat de tijd voorbij, dan zetten we de status hier ook op live.
export async function bijwerkenGepland() {
  const nu = Date.now();
  for (const b of await blogs()) {
    if (b.status === "gepland" && b.geplandVoor && new Date(b.geplandVoor).getTime() <= nu) {
      await wijzigBlog(b.id, { status: "live", liveOp: b.geplandVoor, geplandVoor: null });
    }
  }
}
