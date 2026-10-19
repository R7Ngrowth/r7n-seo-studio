import type { Bedoeling, Gat } from "./types";

// R7N-kansscore (0-100). Rekent in code, niet door de AI, zodat dezelfde invoer altijd dezelfde score geeft.
//   potentie     — is er genoeg vraag? Logaritmisch tot ~5.000 per maand; heel grote termen tellen minder (te algemeen)
//   haalbaarheid — hoe moeilijk is het om te ranken (moeilijkheid 0-100)
//   bedoeling    — hoe dicht zit de zoeker bij klant worden
//   gat          — vermenigvuldiger: ontbreekt het onderwerp op de site, of staat het er al
const BEDOELING: Record<Bedoeling, number> = { kopen: 1, vergelijken: 0.95, weten: 0.75, vinden: 0.25 };
const GAT: Record<Gat, number> = { nieuw: 1, aanvullen: 0.65, gedekt: 0.2 };

export function potentie(volume: number | null, gemeten: boolean): number {
  if (volume === null) return gemeten ? 0.1 : 0.45; // gemeten maar onbekend = vrijwel geen vraag
  if (volume <= 0) return 0.05;
  const p = Math.min(1, Math.log10(volume + 1) / Math.log10(5000));
  return volume > 20_000 ? p * 0.6 : p;
}

export function score(i: { volume: number | null; moeilijkheid: number | null; bedoeling: Bedoeling; gat: Gat; gemeten: boolean }): number {
  const haalbaar = i.moeilijkheid === null ? 0.6 : (100 - Math.min(100, Math.max(0, i.moeilijkheid))) / 100;
  const basis = 0.4 * potentie(i.volume, i.gemeten) + 0.35 * haalbaar + 0.25 * (BEDOELING[i.bedoeling] ?? 0.6);
  return Math.round(100 * basis * (GAT[i.gat] ?? 0.6));
}
