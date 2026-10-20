"use server";

import { revalidatePath } from "next/cache";
import { analyseerProfielen, gebruikDfs, werkReviewsBij, zoekProfielen, type LokaalAnalyse, type ProfielAnalyse, type Zoekresultaat } from "@/lib/lokaal";
import { plaatsUit, schrijfTeksten } from "@/lib/lokaal-teksten";
import { bewaarLokaal, instellingen, log, lokaalAnalyse, profielen, verwijderProfiel, voegProfielToe, wijzigProfiel, zetSuggestie, type SuggestieStand } from "@/lib/opslag";
import type { Instellingen } from "@/lib/types";

type Uitkomst<T> = { ok: true; data: T } | { ok: false; fout: string };
const mis = (e: unknown) => ({ ok: false as const, fout: e instanceof Error ? e.message : String(e) });
const ververs = () => revalidatePath("/lokaal", "layout");

async function start() {
  const i = await instellingen();
  gebruikDfs(i.dfs);
  return i;
}

const schoneUrl = (u: string) => {
  const t = u.trim();
  if (!t) return "";
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).toString();
  } catch {
    throw new Error(`"${t}" is geen geldig webadres.`);
  }
};
const schoneWoorden = (l: string[]) => [...new Set(l.map((w) => w.toLowerCase().trim()).filter(Boolean))].slice(0, 5);

/* ------------------------------ Profielen ------------------------------ */

export async function zoek(vraag: string): Promise<Uitkomst<Zoekresultaat[]>> {
  try {
    await start();
    if (vraag.trim().length < 3) throw new Error("Typ de naam en de plaats van het bedrijf.");
    return { ok: true, data: (await zoekProfielen(vraag.trim())).resultaten };
  } catch (e) {
    return mis(e);
  }
}

export async function voegToe(r: Zoekresultaat, paginaUrl: string, zoekwoorden: string[]): Promise<Uitkomst<null>> {
  try {
    await voegProfielToe({ cid: r.cid, naam: r.naam, adres: r.adres, lat: r.lat, lng: r.lng, pagina_url: schoneUrl(paginaUrl), zoekwoorden: schoneWoorden(zoekwoorden) });
    await log("lokaal", `Bedrijfsprofiel toegevoegd: ${r.naam}`);
    ververs();
    return { ok: true, data: null };
  } catch (e) {
    return mis(e);
  }
}

export async function werkBij(id: string, paginaUrl: string, zoekwoorden: string[]): Promise<Uitkomst<null>> {
  try {
    await wijzigProfiel(id, { pagina_url: schoneUrl(paginaUrl), zoekwoorden: schoneWoorden(zoekwoorden) });
    ververs();
    return { ok: true, data: null };
  } catch (e) {
    return mis(e);
  }
}

export async function verwijder(id: string): Promise<Uitkomst<null>> {
  try {
    await verwijderProfiel(id);
    ververs();
    return { ok: true, data: null };
  } catch (e) {
    return mis(e);
  }
}

/* ------------------------------ Analyse ------------------------------ */

async function metTeksten(i: Instellingen, lijst: ProfielAnalyse[]): Promise<string[]> {
  const fouten: string[] = [];
  await Promise.all(
    lijst
      .filter((p) => p.data)
      .map(async (p) => {
        try {
          p.teksten = await schrijfTeksten(i, p, plaatsUit(p.data!.adres));
        } catch (e) {
          fouten.push(`${p.naam}: ${e instanceof Error ? e.message : e}`);
        }
      })
  );
  return fouten;
}

export async function analyseer(): Promise<Uitkomst<LokaalAnalyse>> {
  const begin = Date.now();
  try {
    const i = await start();
    const lijst = await profielen();
    if (!lijst.length) throw new Error("Voeg eerst een bedrijfsprofiel toe bij Profielen.");
    // Lokaal is er geen tijdslimiet, maar langer dan 3 minuten op reviews wachten heeft geen zin.
    const a = await analyseerProfielen(lijst, { wachtOpReviewsTot: begin + 180_000 });
    if (i.ai.sleutel) {
      a.ai = true;
      const fouten = await metTeksten(i, a.profielen);
      if (fouten.length) a.waarschuwing = [a.waarschuwing, `Teksten niet gelukt voor ${fouten.join("; ")}`].filter(Boolean).join(" ");
    }
    const opgeslagen = await bewaarLokaal(a);
    await log("lokaal", `Lokale analyse: ${a.profielen.length} profiel(en), kosten $${a.kosten.toFixed(3)}`);
    ververs();
    return { ok: true, data: opgeslagen };
  } catch (e) {
    await log("fout", `Lokale analyse mislukt: ${e instanceof Error ? e.message : e}`).catch(() => {});
    return mis(e);
  }
}

export async function reviewsBijwerken(): Promise<Uitkomst<LokaalAnalyse>> {
  try {
    const i = await start();
    const a = await lokaalAnalyse();
    if (!a) throw new Error("Er is nog geen analyse.");
    const { analyse, bijgewerkt } = await werkReviewsBij(a, await profielen());
    if (i.ai.sleutel && bijgewerkt.length) await metTeksten(i, analyse.profielen.filter((p) => bijgewerkt.includes(p.profiel_id)));
    const opgeslagen = await bewaarLokaal(analyse);
    ververs();
    return { ok: true, data: opgeslagen };
  } catch (e) {
    return mis(e);
  }
}

export async function tekstenOpnieuw(profielId: string): Promise<Uitkomst<LokaalAnalyse>> {
  try {
    const i = await start();
    if (!i.ai.sleutel) throw new Error("Vul eerst je OpenRouter-sleutel in bij Instellingen.");
    const a = await lokaalAnalyse();
    const p = a?.profielen.find((x) => x.profiel_id === profielId);
    if (!a || !p?.data) throw new Error("Profiel niet gevonden in de laatste analyse.");
    p.teksten = await schrijfTeksten(i, p, plaatsUit(p.data.adres));
    a.ai = true;
    const opgeslagen = await bewaarLokaal(a);
    ververs();
    return { ok: true, data: opgeslagen };
  } catch (e) {
    return mis(e);
  }
}

/* ------------------------------ Los alles op (suggesties) ------------------------------ */

export async function markeerSuggestie(id: string, w: { status?: "open" | "gedaan" | "overgeslagen"; tekst?: string }): Promise<Uitkomst<SuggestieStand>> {
  try {
    return { ok: true, data: await zetSuggestie(id, w) };
  } catch (e) {
    return mis(e);
  }
}
