"use server";

import { controleerSleutel } from "@/lib/ai";
import { bewaarInstellingen, instellingen, log } from "@/lib/opslag";
import { analyseerWebsite, type Websiteanalyse } from "@/lib/profiel";
import type { Koppeling, Opmaak, Profiel } from "@/lib/types";
import { plek } from "@/lib/plek";
import { dfsSaldo } from "@/lib/zoekwoorden";

type Uitkomst<T> = { ok: true; data: T } | { ok: false; fout: string };
const mis = (e: unknown) => ({ ok: false as const, fout: e instanceof Error ? e.message : String(e) });

export async function analyseer(adres: string, sleutel: string, tekstmodel: string, beeldmodel: string): Promise<Uitkomst<Websiteanalyse>> {
  try {
    if (!adres.trim()) throw new Error("Vul het adres van je website in.");
    const check = await controleerSleutel(sleutel);
    if (!check.ok) throw new Error(check.melding);
    const ai = { ...(await instellingen()).ai, sleutel: sleutel.trim(), tekstmodel, beeldmodel };
    await bewaarInstellingen({ ai });
    return { ok: true, data: await analyseerWebsite(adres, ai) };
  } catch (e) {
    return mis(e);
  }
}

export async function testKoppeling(k: Koppeling): Promise<Uitkomst<string>> {
  try {
    const p = plek(k);
    if (!p) return { ok: true, data: "Geen koppeling nodig: je kopieert de blog zelf naar je platform." };
    return { ok: true, data: await p.test() };
  } catch (e) {
    return mis(e);
  }
}

export async function rondAf(profiel: Profiel, koppeling: Koppeling, opmaak: Opmaak): Promise<Uitkomst<null>> {
  try {
    if (!profiel.naam.trim()) throw new Error("Vul de naam van je bedrijf in.");
    await bewaarInstellingen({ klaar: true, profiel, koppeling, opmaak });
    await log("setup", `Studio ingesteld voor ${profiel.website}`);
    return { ok: true, data: null };
  } catch (e) {
    return mis(e);
  }
}

// Optionele stap Lokaal: DataForSEO-login controleren (gratis aanroep) en bewaren.
export async function bewaarDfs(login: string, wachtwoord: string): Promise<Uitkomst<number | null>> {
  try {
    const d = { login: login.trim(), wachtwoord: wachtwoord.trim() };
    if (!d.login || !d.wachtwoord) throw new Error("Vul je DataForSEO API-login en API-wachtwoord in.");
    const saldo = await dfsSaldo(d);
    await bewaarInstellingen({ dfs: d });
    return { ok: true, data: saldo };
  } catch (e) {
    return mis(e);
  }
}
