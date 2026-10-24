"use server";

import { revalidatePath } from "next/cache";
import { controleerSleutel, json } from "@/lib/ai";
import { analyseerKansen } from "@/lib/kansen";
import { naarHtml, zonderBouwstenen } from "@/lib/markdown";
import { blog, bewaarInstellingen, blogs, instellingen, log, verwijderBlog, wijzigBlog } from "@/lib/opslag";
import { plek } from "@/lib/plek";
import type { Blog, Instellingen, Kansenrapport } from "@/lib/types";
import { maakBlog, opnieuwBeeld, plaats } from "@/lib/werk";
import { dfsSaldo } from "@/lib/zoekwoorden";

type Uitkomst<T> = { ok: true; data: T } | { ok: false; fout: string };
const mis = (e: unknown) => ({ ok: false as const, fout: e instanceof Error ? e.message : String(e) });
const ververs = () => revalidatePath("/", "layout");

async function doe<T>(fn: () => Promise<T>): Promise<Uitkomst<T>> {
  try {
    const data = await fn();
    ververs();
    return { ok: true, data };
  } catch (e) {
    await log("fout", e instanceof Error ? e.message : String(e)).catch(() => {});
    return mis(e);
  }
}

export const analyseer = async (): Promise<Uitkomst<Kansenrapport>> => doe(async () => analyseerKansen(await instellingen()));
// Aanbod (productgroepen en diensten) bijwerken vanaf de Kansen-pagina; de volgende analyse onderzoekt ze allemaal.
export const bewaarAanbod = async (aanbod: string): Promise<Uitkomst<string>> =>
  doe(async () => {
    const i = await instellingen();
    const schoon = aanbod.split(/[,\n;]/).map((t) => t.trim()).filter(Boolean).join(", ");
    await bewaarInstellingen({ profiel: { ...i.profiel, aanbod: schoon } });
    return schoon;
  });
export const schrijfBlog = async (onderwerp: string, kansId?: string): Promise<Uitkomst<string>> =>
  doe(async () => {
    if (!onderwerp.trim()) throw new Error("Vul een onderwerp in.");
    return (await maakBlog(onderwerp.trim(), kansId)).id;
  });

export async function ideeen(): Promise<Uitkomst<string[]>> {
  try {
    const i = await instellingen();
    const bestaand = (await blogs()).map((b) => b.titel).filter(Boolean);
    const { ideeen } = await json<{ ideeen: string[] }>(
      i.ai.sleutel,
      i.ai.tekstmodel,
      [
        {
          role: "system",
          content: `Bedenk 6 blogonderwerpen voor ${i.profiel.naam} (${i.profiel.onderwerp}), voor ${i.profiel.doelgroep}, in het ${i.profiel.taal}. Concreet, gericht op vragen die klanten echt stellen, en verschillend van wat er al is. Antwoord alleen met JSON: {"ideeen": ["…"]}`,
        },
        { role: "user", content: `Bestaande blogs:\n${bestaand.map((t) => `- ${t}`).join("\n") || "(geen)"}` },
      ],
      1200
    );
    return { ok: true, data: (ideeen ?? []).slice(0, 6) };
  } catch (e) {
    return mis(e);
  }
}

type Bewerking = Pick<Blog, "titel" | "adres" | "intro" | "tekst" | "meta" | "categorie" | "tags" | "beeldPrompt">;
export const bewaarBlog = async (id: string, w: Bewerking) => doe(() => wijzigBlog(id, w));
export const nieuweAfbeelding = async (id: string, prompt: string) => doe(() => opnieuwBeeld(id, prompt));
export const zetOpSite = async (id: string, w: Bewerking, status: "live" | "gepland" | "concept", wanneer?: string) =>
  doe(async () => {
    await wijzigBlog(id, w);
    return plaats(id, status, wanneer);
  });
export const markeerLive = async (id: string, url: string) =>
  doe(() => wijzigBlog(id, { status: "live", liveOp: new Date().toISOString(), liveUrl: url.trim() || null }));
export const verwijder = async (id: string) =>
  doe(async () => {
    const b = await blog(id);
    const p = plek((await instellingen()).koppeling);
    if (b?.cmsId && b.status !== "live" && p) await p.verwijder(b.cmsId).catch(() => {});
    await verwijderBlog(id);
    return null;
  });

// Voor kopiëren en plakken naar elk platform.
export async function kopieerVersie(id: string): Promise<Uitkomst<{ html: string; markdown: string }>> {
  const b = await blog(id);
  if (!b) return mis(new Error("Blog niet gevonden"));
  const md = zonderBouwstenen(b.tekst);
  return { ok: true, data: { html: naarHtml(md), markdown: `# ${b.titel}\n\n${md}` } };
}

/* ------------------------------ instellingen ------------------------------ */

export async function bewaarAlles(w: Partial<Instellingen> & { nieuweSleutel?: string; nieuwDfsWachtwoord?: string }): Promise<Uitkomst<null>> {
  try {
    const nu = await instellingen();
    const { nieuweSleutel, nieuwDfsWachtwoord, ...rest } = w;
    if (nieuweSleutel?.trim()) {
      const c = await controleerSleutel(nieuweSleutel);
      if (!c.ok) throw new Error(c.melding);
    }
    await bewaarInstellingen({
      ...rest,
      ai: { ...nu.ai, ...rest.ai, sleutel: nieuweSleutel?.trim() || nu.ai.sleutel },
      dfs: { login: rest.dfs?.login ?? nu.dfs.login, wachtwoord: nieuwDfsWachtwoord?.trim() || nu.dfs.wachtwoord },
      koppeling: {
        ...nu.koppeling,
        ...rest.koppeling,
        wpWachtwoord: rest.koppeling?.wpWachtwoord?.trim() || nu.koppeling.wpWachtwoord,
        shopClientSecret: rest.koppeling?.shopClientSecret?.trim() || nu.koppeling.shopClientSecret,
        shopToken: rest.koppeling?.shopToken?.trim() || nu.koppeling.shopToken,
        apiSleutel: rest.koppeling?.apiSleutel?.trim() || nu.koppeling.apiSleutel,
      },
    });
    ververs();
    return { ok: true, data: null };
  } catch (e) {
    return mis(e);
  }
}

export async function testOpgeslagen(): Promise<Uitkomst<string>> {
  try {
    const p = plek((await instellingen()).koppeling);
    return { ok: true, data: p ? await p.test() : "Geen automatische koppeling ingesteld: je kopieert blogs zelf naar je platform." };
  } catch (e) {
    return mis(e);
  }
}

export async function testDfs(): Promise<Uitkomst<string>> {
  try {
    const s = await dfsSaldo((await instellingen()).dfs);
    return { ok: true, data: s === null ? "DataForSEO werkt." : `DataForSEO werkt · tegoed $${s.toFixed(2)}` };
  } catch (e) {
    return mis(e);
  }
}
