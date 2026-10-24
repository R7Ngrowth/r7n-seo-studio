// Lokale SEO: Google Bedrijfsprofielen analyseren met DataForSEO.
// Per profiel: profielgegevens, positie in Google Maps vanaf punten rond de winkel (zoals een klant zoekt),
// concurrenten, reviews en een check tegen de eigen vestigingspagina. Score en kansen rekent de code uit;
// de teksten (beschrijving, berichten, review-antwoorden) schrijft de AI in lokaal-teksten.ts.
import { haal, ontcijfer } from "./site";
import type { DataForSeo } from "./types";

// De DataForSEO-login van de gebruiker (uit Instellingen). Wordt aan het begin van elke actie gezet; de Studio heeft één gebruiker.
let LOGIN: DataForSeo = { login: "", wachtwoord: "" };
export function gebruikDfs(d: DataForSeo) {
  LOGIN = d;
}
const hasDataForSeo = () => !!(LOGIN.login.trim() && LOGIN.wachtwoord.trim());
const dfsAuth = () => `Basic ${Buffer.from(`${LOGIN.login.trim()}:${LOGIN.wachtwoord.trim()}`).toString("base64")}`;

/* ------------------------------ Types ------------------------------ */

export interface Vestiging {
  id: string;
  cid: string;
  naam: string;
  adres: string;
  lat: number | null;
  lng: number | null;
  pagina_url: string;
  zoekwoorden: string[];
  aangemaakt: string;
}

export interface Zoekresultaat {
  cid: string;
  naam: string;
  adres: string;
  sterren: number | null;
  reviews: number | null;
  categorie: string;
  extra: string[];
  lat: number | null;
  lng: number | null;
}

export const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;
export type Dag = (typeof DAGEN)[number];
export type Uren = Record<Dag, string[]>; // per dag tijdvakken als "09:30-18:00"; leeg = gesloten

export interface ProfielData {
  naam: string;
  adres: string;
  telefoon: string;
  website: string;
  categorie: string;
  extra: string[];
  sterren: number | null;
  reviews: number;
  verdeling: Record<string, number>;
  fotos: number;
  beschrijving: string;
  uren: Uren | null;
  geclaimd: boolean | null;
  afspraak_url: string;
  diensten: string[];
  themas: Record<string, number>; // waar reviews het vaakst over gaan
  lat: number | null;
  lng: number | null;
}

export type Punt = "N" | "O" | "Z" | "W";
export const PUNTEN: Punt[] = ["N", "O", "Z", "W"];
export interface Meting {
  zoekwoord: string;
  punt: Punt;
  positie: number | null; // null = niet in de top 20
}

export interface Concurrent {
  cid: string;
  naam: string;
  sterren: number | null;
  reviews: number | null;
  fotos: number | null;
  categorie: string;
  boven: number; // hoe vaak deze zaak boven ons stond
  gem_positie: number;
}

export interface OpenReview {
  sterren: number;
  datum: string;
  tekst: string;
}

export interface ReviewStats {
  status: "klaar" | "wacht" | "mislukt";
  taak_id?: string;
  opgehaald: number;
  beantwoord: number;
  negatief: number;
  negatief_open: number;
  laatste_90: number;
  nieuwste_dagen: number | null;
  open: OpenReview[]; // onbeantwoorde reviews met 3 sterren of minder (max 5, nieuwste eerst)
}

export interface SiteCheck {
  pagina_url: string;
  gelezen: boolean;
  telefoon_klopt: boolean | null;
  uren_site: Uren | null;
  uren_verschil: Dag[];
}

export interface Check {
  id: string;
  label: string;
  ok: boolean | null; // null = niet te controleren (telt niet mee)
  gewicht: number;
  punten: number;
  uitleg: string;
  actie: string;
}

export interface Kans {
  titel: string;
  actie: string;
  impact: "hoog" | "middel" | "laag";
}

export interface Teksten {
  beschrijving: string;
  berichten: string[];
  review_antwoorden: { review: string; antwoord: string }[];
  observaties: string[];
}

export interface ProfielAnalyse {
  profiel_id: string;
  cid: string;
  naam: string;
  data: ProfielData | null;
  metingen: Meting[];
  concurrenten: Concurrent[]; // zelfde soort bedrijf, staan boven je
  anderen?: Concurrent[]; // staan ook boven je op je zoekwoorden, maar bieden iets anders (geen concurrent)
  reviews: ReviewStats;
  site: SiteCheck;
  checks: Check[];
  score: number;
  kansen: Kans[];
  teksten: Teksten | null;
  fout?: string;
}

export interface LokaalAnalyse {
  id?: string;
  gemaakt: string;
  kosten: number;
  ai: boolean;
  profielen: ProfielAnalyse[];
  waarschuwing?: string;
}

/* ------------------------------ DataForSEO ------------------------------ */

interface DfsTaak<T> {
  id: string;
  status_code: number;
  status_message: string;
  cost?: number;
  data?: { tag?: string };
  result?: T[] | null;
}

class Kosten {
  totaal = 0;
  tel(c: unknown) {
    if (typeof c === "number") this.totaal += c;
  }
}

async function post<T>(pad: string, taken: Record<string, unknown>[], k: Kosten): Promise<DfsTaak<T>[]> {
  const res = await fetch(`https://api.dataforseo.com/v3/${pad}`, {
    method: "POST",
    headers: { Authorization: dfsAuth(), "Content-Type": "application/json" },
    body: JSON.stringify(taken),
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 401) throw new Error("DataForSEO kent deze API-login of dit API-wachtwoord niet.");
  if (res.status === 402) throw new Error("Het tegoed bij DataForSEO is op.");
  const body = (await res.json()) as { status_code?: number; status_message?: string; cost?: number; tasks?: DfsTaak<T>[] };
  if (body.status_code !== 20000) throw new Error(`DataForSEO: ${body.status_message ?? "onbekende fout"}`);
  k.tel(body.cost);
  return body.tasks ?? [];
}

async function eenLive<T>(pad: string, taak: Record<string, unknown>, k: Kosten): Promise<T | null> {
  const [t] = await post<T>(pad, [taak], k);
  if (!t || t.status_code >= 40000) throw new Error(`DataForSEO: ${t?.status_message ?? "geen antwoord"}`);
  return t.result?.[0] ?? null;
}

async function taakResultaat<T>(pad: string, id: string): Promise<{ klaar: boolean; result: T | null; fout?: string }> {
  const res = await fetch(`https://api.dataforseo.com/v3/${pad}/${id}`, { headers: { Authorization: dfsAuth() }, signal: AbortSignal.timeout(30_000) });
  const body = (await res.json()) as { tasks?: DfsTaak<T>[] };
  const t = body.tasks?.[0];
  if (!t) return { klaar: false, result: null };
  if (t.status_code === 20000) return { klaar: true, result: t.result?.[0] ?? null };
  if ([40601, 40602].includes(t.status_code)) return { klaar: false, result: null }; // nog in de wachtrij
  return { klaar: true, result: null, fout: t.status_message };
}

// Maximaal n verzoeken tegelijk (DataForSEO staat er 30 toe).
async function metLimiet<T, U>(lijst: T[], n: number, f: (x: T) => Promise<U>): Promise<U[]> {
  const uit: U[] = new Array(lijst.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, lijst.length) }, async () => {
      while (i < lijst.length) {
        const j = i++;
        uit[j] = await f(lijst[j]);
      }
    })
  );
  return uit;
}

const pauze = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NL = { language_code: "nl" };

interface MapsItem {
  type: string;
  rank_group: number;
  cid?: string;
  title?: string;
  address?: string;
  category?: string;
  additional_categories?: string[] | null;
  total_photos?: number;
  rating?: { value?: number; votes_count?: number } | null;
  latitude?: number;
  longitude?: number;
}

/* ------------------------------ Vestiging zoeken ------------------------------ */

export async function zoekProfielen(vraag: string): Promise<{ resultaten: Zoekresultaat[]; kosten: number }> {
  if (!hasDataForSeo()) throw new Error("DataForSEO is niet gekoppeld. Vul je API-login en API-wachtwoord in bij Instellingen.");
  const k = new Kosten();
  const r = await eenLive<{ items?: MapsItem[] }>(
    "serp/google/maps/live/advanced",
    { keyword: vraag, location_name: "Netherlands", ...NL, depth: 10, search_this_area: false },
    k
  );
  const resultaten = (r?.items ?? [])
    .filter((i) => i.type === "maps_search" && i.cid)
    .map((i) => ({
      cid: i.cid!,
      naam: i.title ?? "",
      adres: i.address ?? "",
      sterren: i.rating?.value ?? null,
      reviews: i.rating?.votes_count ?? null,
      categorie: i.category ?? "",
      extra: i.additional_categories ?? [],
      lat: i.latitude ?? null,
      lng: i.longitude ?? null,
    }));
  return { resultaten, kosten: k.totaal };
}

// Voorstel voor zoekwoorden uit de categorieën van het profiel ("Fietsenwinkel" → "fietsenwinkel").
export function standaardZoekwoorden(categorie: string, extra: string[]): string[] {
  return [...new Set([categorie, ...extra].map((c) => c.toLowerCase().trim()).filter(Boolean))].slice(0, 3);
}

/* ------------------------------ Opslag ------------------------------ */
// Profielen en analyses staan in data/profielen.json en data/lokaal.json (zie opslag.ts).

/* ------------------------------ Ophalen per profiel ------------------------------ */

const twee = (n: number) => String(n).padStart(2, "0");
const ENG: Record<string, Dag> = { monday: "ma", tuesday: "di", wednesday: "wo", thursday: "do", friday: "vr", saturday: "za", sunday: "zo" };
type Tijd = { hour: number; minute: number };

function urenUitGoogle(t: Record<string, { open: Tijd; close: Tijd }[] | null> | undefined): Uren | null {
  if (!t) return null;
  const u = Object.fromEntries(DAGEN.map((d) => [d, [] as string[]])) as Uren;
  for (const [eng, vakken] of Object.entries(t)) {
    const d = ENG[eng];
    if (d && vakken) u[d] = vakken.map((v) => `${twee(v.open.hour)}:${twee(v.open.minute)}-${twee(v.close.hour)}:${twee(v.close.minute)}`);
  }
  return u;
}

interface InfoItem extends MapsItem {
  description?: string;
  phone?: string;
  url?: string;
  is_claimed?: boolean;
  book_online_url?: string;
  rating_distribution?: Record<string, number>;
  place_topics?: Record<string, number> | null;
  services?: { title?: string }[] | null;
  work_time?: { work_hours?: { timetable?: Record<string, { open: Tijd; close: Tijd }[] | null> } } | null;
}

async function profielInfo(cid: string, k: Kosten): Promise<ProfielData | null> {
  const r = await eenLive<{ items?: InfoItem[] }>("business_data/google/my_business_info/live", { keyword: `cid:${cid}`, location_name: "Netherlands", ...NL }, k);
  const i = r?.items?.[0];
  if (!i) return null;
  return {
    naam: i.title ?? "",
    adres: i.address ?? "",
    telefoon: i.phone ?? "",
    website: i.url ?? "",
    categorie: i.category ?? "",
    extra: i.additional_categories ?? [],
    sterren: i.rating?.value ?? null,
    reviews: i.rating?.votes_count ?? 0,
    verdeling: i.rating_distribution ?? {},
    fotos: i.total_photos ?? 0,
    beschrijving: (i.description ?? "").trim(),
    uren: urenUitGoogle(i.work_time?.work_hours?.timetable),
    geclaimd: i.is_claimed ?? null,
    afspraak_url: i.book_online_url ?? "",
    diensten: (i.services ?? []).map((s) => s.title ?? "").filter(Boolean),
    themas: i.place_topics ?? {},
    lat: i.latitude ?? null,
    lng: i.longitude ?? null,
  };
}

// Vier punten op ±2 km rond de winkel: zo zoekt een klant vanuit huis. Vanaf de winkel zelf sta je bijna altijd op 1.
const VERSCHUIF: Record<Punt, [number, number]> = { N: [0.018, 0], O: [0, 0.03], Z: [-0.018, 0], W: [0, -0.03] };

interface RasterUit {
  metingen: Meting[];
  lijsten: { zoekwoord: string; punt: Punt; items: MapsItem[] }[];
}

async function raster(lat: number, lng: number, cid: string, zoekwoorden: string[], k: Kosten): Promise<RasterUit> {
  const taken = zoekwoorden.flatMap((zoekwoord) => PUNTEN.map((punt) => ({ zoekwoord, punt })));
  const lijsten = await metLimiet(taken, 8, async ({ zoekwoord, punt }) => {
    const [dla, dlo] = VERSCHUIF[punt];
    try {
      const r = await eenLive<{ items?: MapsItem[] }>(
        "serp/google/maps/live/advanced",
        { keyword: zoekwoord, location_coordinate: `${(lat + dla).toFixed(6)},${(lng + dlo).toFixed(6)},14z`, ...NL, depth: 20 },
        k
      );
      return { zoekwoord, punt, items: (r?.items ?? []).filter((i) => i.type === "maps_search") };
    } catch {
      return { zoekwoord, punt, items: [] as MapsItem[] };
    }
  });
  const metingen = lijsten.map((l) => ({ zoekwoord: l.zoekwoord, punt: l.punt, positie: l.items.find((i) => i.cid === cid)?.rank_group ?? null }));
  return { metingen, lijsten };
}

// De zaken die het vaakst boven ons staan (eigen andere vestigingen tellen niet mee). Nog ongefilterd: ook bedrijven uit een andere branche.
export function kandidatenUit(r: RasterUit, cid: string, eigen: Set<string>, max = 8): Concurrent[] {
  const telling = new Map<string, Concurrent & { som: number; n: number }>();
  for (const l of r.lijsten) {
    const onze = l.items.find((i) => i.cid === cid)?.rank_group ?? 21;
    for (const i of l.items) {
      if (!i.cid || i.cid === cid || eigen.has(i.cid) || i.rank_group >= onze) continue;
      const c = telling.get(i.cid) ?? {
        cid: i.cid,
        naam: i.title ?? "",
        sterren: i.rating?.value ?? null,
        reviews: i.rating?.votes_count ?? null,
        fotos: i.total_photos ?? null,
        categorie: i.category ?? "",
        boven: 0,
        gem_positie: 0,
        som: 0,
        n: 0,
      };
      c.boven++;
      c.som += i.rank_group;
      c.n++;
      telling.set(i.cid, c);
    }
  }
  return [...telling.values()]
    .map(({ som, n, ...c }) => ({ ...c, gem_positie: Math.round((som / n) * 10) / 10 }))
    .sort((a, b) => b.boven - a.boven || a.gem_positie - b.gem_positie)
    .slice(0, max);
}

// Is dit hetzelfde soort bedrijf? Vergelijkt de Google-categorieën: gelijk, de een bevat de ander ("bakkerij" in "banketbakkerij"),
// of een gemeenschappelijk begin van minstens 5 letters ("fietsenwinkel" en "fietsenmaker"). Zo wordt een escaperoom geen
// concurrent van een winkel in escape-spellen voor thuis, alleen omdat hij op hetzelfde zoekwoord verschijnt.
const woorden = (c: string) => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/).filter((w) => w.length >= 4);
export function zelfdeBranche(onze: string[], hun: string): boolean {
  const h = woorden(hun);
  if (!h.length) return false;
  for (const o of onze.flatMap(woorden)) {
    for (const w of h) {
      if (o === w) return true;
      if ((o.length >= 5 && w.includes(o)) || (w.length >= 5 && o.includes(w))) return true;
      let n = 0;
      while (n < o.length && n < w.length && o[n] === w[n]) n++;
      if (n >= 5) return true;
    }
  }
  return false;
}

// Kandidaten splitsen in echte concurrenten en andere soorten bedrijven. Het oordeel (van de AI) wint als het er is; anders de categorieën.
export function splitsConcurrenten(kandidaten: Concurrent[], d: ProfielData, oordeel?: Map<string, boolean> | null): { concurrenten: Concurrent[]; anderen: Concurrent[] } {
  const onze = [d.categorie, ...d.extra].filter(Boolean);
  const peer = (c: Concurrent) => oordeel?.get(c.cid) ?? (onze.length ? zelfdeBranche(onze, c.categorie) : true);
  return { concurrenten: kandidaten.filter(peer).slice(0, 3), anderen: kandidaten.filter((c) => !peer(c)).slice(0, 3) };
}

/* ------------------------------ Reviews ------------------------------ */

interface ReviewItem {
  rating?: { value?: number } | null;
  timestamp?: string;
  review_text?: string | null;
  owner_answer?: string | null;
}

const LEGE_REVIEWS: ReviewStats = { status: "wacht", opgehaald: 0, beantwoord: 0, negatief: 0, negatief_open: 0, laatste_90: 0, nieuwste_dagen: null, open: [] };

export function reviewStats(items: ReviewItem[]): ReviewStats {
  const nu = Date.now();
  const dagen = (t?: string) => (t ? Math.floor((nu - Date.parse(t.replace(" +00:00", "Z").replace(" ", "T"))) / 86_400_000) : null);
  const neg = items.filter((i) => (i.rating?.value ?? 5) <= 3);
  const leeftijden = items.map((i) => dagen(i.timestamp)).filter((d): d is number => d !== null && !Number.isNaN(d));
  return {
    status: "klaar",
    opgehaald: items.length,
    beantwoord: items.filter((i) => i.owner_answer).length,
    negatief: neg.length,
    negatief_open: neg.filter((i) => !i.owner_answer).length,
    laatste_90: leeftijden.filter((d) => d <= 90).length,
    nieuwste_dagen: leeftijden.length ? Math.min(...leeftijden) : null,
    open: neg
      .filter((i) => !i.owner_answer)
      .slice(0, 5)
      .map((i) => ({ sterren: i.rating?.value ?? 0, datum: (i.timestamp ?? "").slice(0, 10), tekst: (i.review_text ?? "").trim().slice(0, 1200) })),
  };
}

async function reviewsAanvragen(profielen: Vestiging[], k: Kosten): Promise<Map<string, string>> {
  const taken = profielen.map((p) => ({ cid: p.cid, location_name: "Netherlands", ...NL, depth: 30, sort_by: "newest", tag: p.id }));
  const uit = new Map<string, string>();
  for (const t of await post<unknown>("business_data/google/reviews/task_post", taken, k))
    if (t.status_code === 20100 && t.data?.tag) uit.set(t.data.tag, t.id);
  return uit;
}

export async function reviewsOphalen(taakId: string): Promise<ReviewStats> {
  const r = await taakResultaat<{ items?: ReviewItem[] }>("business_data/google/reviews/task_get", taakId);
  if (!r.klaar) return { ...LEGE_REVIEWS, taak_id: taakId };
  if (!r.result) return { ...LEGE_REVIEWS, status: "mislukt" };
  return reviewStats(r.result.items ?? []);
}

/* ------------------------------ Eigen site ------------------------------ */

const DAGNAMEN: [Dag, string][] = [
  ["ma", "maandag"],
  ["di", "dinsdag"],
  ["wo", "woensdag"],
  ["do", "donderdag"],
  ["vr", "vrijdag"],
  ["za", "zaterdag"],
  ["zo", "zondag"],
];

// Leest openingstijden van een pagina als "Maandag Gesloten · Dinsdag 09:30 – 18:00 · …". Lukt dat niet voor de hele week, dan null.
export function urenUitTekst(tekst: string): Uren | null {
  const u = Object.fromEntries(DAGEN.map((d) => [d, [] as string[]])) as Uren;
  let gevonden = 0;
  for (const [d, naam] of DAGNAMEN) {
    const m = new RegExp(`\\b${naam}\\b[\\s:|]*((?:gesloten|dicht|\\d{1,2}[:.]\\d{2}\\s*(?:-|–|—|tot)\\s*\\d{1,2}[:.]\\d{2}(?:[\\s,&en]*\\d{1,2}[:.]\\d{2}\\s*(?:-|–|—|tot)\\s*\\d{1,2}[:.]\\d{2})?))`, "i").exec(tekst);
    if (!m) continue;
    gevonden++;
    if (/gesloten|dicht/i.test(m[1])) continue;
    u[d] = [...m[1].matchAll(/(\d{1,2})[:.](\d{2})\s*(?:-|–|—|tot)\s*(\d{1,2})[:.](\d{2})/g)].map((t) => `${twee(+t[1])}:${t[2]}-${twee(+t[3])}:${t[4]}`);
  }
  return gevonden >= 6 ? u : null;
}

const cijfers = (t: string) => t.replace(/\D/g, "").replace(/^0031/, "0").replace(/^31/, "0");

export async function siteCheck(paginaUrl: string, telefoon: string, uren: Uren | null): Promise<SiteCheck> {
  const leeg: SiteCheck = { pagina_url: paginaUrl, gelezen: false, telefoon_klopt: null, uren_site: null, uren_verschil: [] };
  if (!paginaUrl) return leeg;
  const r = await haal(paginaUrl);
  if (!r) return leeg;
  const tekst = ontcijfer(
    r.html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " | ")
  ).replace(/\s+/g, " ");
  const tel = cijfers(telefoon);
  const nummers = new Set([...tekst.matchAll(/(?:\+31|0)[\d\s().-]{8,16}\d/g)].map((m) => cijfers(m[0])));
  const urenSite = urenUitTekst(tekst.replace(/\s*\|\s*/g, " "));
  return {
    pagina_url: paginaUrl,
    gelezen: true,
    telefoon_klopt: tel ? nummers.has(tel) : null,
    uren_site: urenSite,
    uren_verschil: urenSite && uren ? DAGEN.filter((d) => urenSite[d].join(",") !== uren[d].join(",")) : [],
  };
}

/* ------------------------------ Score en kansen ------------------------------ */

const pad = (u: string) => {
  try {
    return new URL(u).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
};
const mediaan = (l: number[]) => {
  if (!l.length) return 0;
  const s = [...l].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const DAGLABEL: Record<Dag, string> = { ma: "maandag", di: "dinsdag", wo: "woensdag", do: "donderdag", vr: "vrijdag", za: "zaterdag", zo: "zondag" };
const toonUren = (u: string[]) => (u.length ? u.join(", ") : "gesloten");

// Elke check levert punten op; samen maximaal 100. Checks die niet te controleren zijn tellen niet mee.
export function beoordeel(
  p: Vestiging,
  d: ProfielData,
  metingen: Meting[],
  concurrenten: Concurrent[],
  rv: ReviewStats,
  site: SiteCheck,
  categorieenAnderen: string[],
  meerdereProfielen: boolean
): { checks: Check[]; score: number; kansen: Kans[] } {
  const c: Check[] = [];
  const zet = (id: string, label: string, gewicht: number, deel: number | null, uitleg: string, actie: string) =>
    c.push({ id, label, gewicht, ok: deel === null ? null : deel >= 0.999, punten: deel === null ? 0 : Math.round(gewicht * Math.max(0, Math.min(1, deel)) * 10) / 10, uitleg, actie });

  const lengte = d.beschrijving.length;
  zet("beschrijving", "Beschrijving", 10, lengte >= 250 ? 1 : lengte / 250, lengte ? `${lengte} tekens` : "geen beschrijving", "Schrijf een volledige beschrijving van ±700 tekens: wat je verkoopt en repareert, welke merken, voor wie, en de plaats. Een voorstel staat hieronder bij Teksten.");

  zet("fotos", "Foto's", 8, d.fotos / 20, `${d.fotos} foto's`, `Voeg foto's toe tot minstens 20 (nu ${d.fotos}): gevel, winkel binnen, collectie, werkplaats en het team. Elke maand een paar nieuwe helpt ook.`);

  zet("extra_cat", "Extra categorieën", 8, d.extra.length ? 1 : 0, d.extra.length ? d.extra.join(", ") : "geen", "Voeg extra categorieën toe die bij je diensten passen, zoals die van de concurrenten boven je. Google gebruikt ze om te bepalen bij welke zoekopdrachten je verschijnt.");

  const pool = [...categorieenAnderen, ...concurrenten.map((x) => x.categorie)].filter(Boolean);
  const vaakst = pool.length ? [...pool.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0][0] : null;
  zet(
    "hoofdcat",
    "Hoofdcategorie",
    6,
    vaakst === null ? null : d.categorie === vaakst ? 1 : 0,
    d.categorie || "geen",
    `De hoofdcategorie is "${d.categorie}", terwijl je andere vestigingen en de concurrenten boven je meestal "${vaakst}" gebruiken. Overweeg "${vaakst}" als hoofdcategorie en "${d.categorie}" als extra.`
  );

  const linkPad = pad(d.website);
  zet(
    "link",
    "Link naar eigen pagina",
    6,
    !d.website ? 0 : p.pagina_url ? (linkPad === pad(p.pagina_url) ? 1 : 0) : meerdereProfielen ? (linkPad === "/" ? 0 : 1) : 1,
    d.website ? d.website.replace(/^https?:\/\//, "") : "geen website-link",
    p.pagina_url
      ? `Laat de website-link naar de eigen vestigingspagina wijzen (${p.pagina_url}), met een UTM-code zodat je in GA4 ziet hoeveel bezoek uit Google Maps komt.`
      : "Laat de website-link naar de eigen vestigingspagina wijzen in plaats van de homepage. Vul de vestigingspagina in bij Profielen."
  );

  zet("afspraak", "Afspraak-link", 2, d.afspraak_url ? 1 : 0, d.afspraak_url ? "ingevuld" : "geen", "Zet een afspraak-link in het profiel, bijvoorbeeld naar de werkplaatsplanner of de proefrit-pagina.");

  const verschil = site.uren_verschil;
  zet(
    "uren",
    "Openingstijden = site",
    8,
    site.uren_site && d.uren ? (verschil.length ? 0 : 1) : null,
    !site.gelezen ? "pagina niet gelezen" : !site.uren_site ? "geen tijden op de pagina gevonden" : verschil.length ? `${verschil.length} dag(en) anders` : "gelijk",
    `De openingstijden in Google wijken af van de site: ${verschil
      .map((x) => `${DAGLABEL[x]} Google ${toonUren(d.uren?.[x] ?? [])}, site ${toonUren(site.uren_site?.[x] ?? [])}`)
      .join("; ")}. Navragen welke klopt en op beide plekken gelijk zetten.`
  );

  zet(
    "telefoon",
    "Telefoon = site",
    5,
    site.telefoon_klopt === null ? null : site.telefoon_klopt ? 1 : 0,
    site.telefoon_klopt === null ? "niet te controleren" : site.telefoon_klopt ? "gelijk" : "niet op de pagina gevonden",
    `Het telefoonnummer van het profiel (${d.telefoon}) staat niet op de vestigingspagina. Zet overal hetzelfde nummer.`
  );

  const ref = mediaan(concurrenten.map((x) => x.reviews ?? 0).filter(Boolean));
  zet(
    "aantal_reviews",
    "Aantal reviews",
    10,
    ref ? d.reviews / ref : d.reviews >= 30 ? 1 : d.reviews / 30,
    `${d.reviews}${ref ? ` (concurrenten ±${ref})` : ""}`,
    `Vraag actief om reviews: ${d.reviews} tegenover ±${ref || 30} bij de concurrenten boven je. Stuur na elke aankoop en reparatie een reviewlink (bijvoorbeeld via de na-aankoop-workflow in GoHighLevel).`
  );

  zet("sterren", "Gemiddelde", 10, d.sterren === null ? 0 : (d.sterren - 3.5) / 1.0, d.sterren === null ? "geen" : `${d.sterren.toFixed(1)} ★`, "Het gemiddelde ligt onder 4,5. Kijk wat er in de slechte reviews terugkomt en los de oorzaak op; antwoord op elke negatieve review.");

  const rate = rv.status === "klaar" && rv.opgehaald ? rv.beantwoord / rv.opgehaald : null;
  zet(
    "reacties",
    "Reageren op reviews",
    10,
    rate === null ? null : rate / 0.5,
    rate === null ? (rv.status === "wacht" ? "reviews nog onderweg" : "geen reviews") : `${rv.beantwoord}/${rv.opgehaald} beantwoord${rv.negatief_open ? `, ${rv.negatief_open} negatieve open` : ""}`,
    rv.negatief_open
      ? `Beantwoord reviews, vooral de negatieve (${rv.negatief_open} staan nog open). Google ziet dat als een actief bedrijf, en lezers zien dat je klachten serieus neemt. Voorstellen staan hieronder bij Teksten.`
      : `Beantwoord ook de positieve reviews (nu ${rv.beantwoord} van de ${rv.opgehaald}). Een kort, persoonlijk bedankje is genoeg; Google ziet het als een actief bedrijf.`
  );

  zet(
    "recent",
    "Recente reviews",
    5,
    rv.status === "klaar" ? rv.laatste_90 / 3 : null,
    rv.status === "klaar" ? `${rv.laatste_90} in de laatste 90 dagen` : "reviews nog onderweg",
    "Er komen weinig nieuwe reviews binnen. Google hecht aan recente reviews: vraag er elke week een paar."
  );

  const pos = metingen.map((m) => m.positie ?? 21);
  const gem = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : null;
  const slechtste = metingen.filter((m) => (m.positie ?? 21) > 5);
  zet(
    "maps",
    "Positie in Google Maps",
    12,
    gem === null ? null : (15 - gem) / 12,
    gem === null ? "niet gemeten" : `gemiddeld plek ${gem.toFixed(1)} vanaf 2 km`,
    `Vanaf ±2 km sta je gemiddeld op plek ${gem?.toFixed(1)}${slechtste.length ? ` (zwakst: ${[...new Set(slechtste.map((m) => m.zoekwoord))].join(", ")})` : ""}. De grootste hefbomen: categorieën, reviews, foto's en een vestigingspagina die de zoekwoorden noemt.`
  );

  const telt = c.filter((x) => x.ok !== null);
  const max = telt.reduce((s, x) => s + x.gewicht, 0);
  const score = max ? Math.round((telt.reduce((s, x) => s + x.punten, 0) / max) * 100) : 0;
  const kansen = telt
    .filter((x) => !x.ok)
    .sort((a, b) => b.gewicht - b.punten - (a.gewicht - a.punten))
    .slice(0, 5)
    .map((x) => {
      const mis = x.gewicht - x.punten;
      return { titel: x.label, actie: x.actie, impact: (mis >= 6 ? "hoog" : mis >= 3 ? "middel" : "laag") as Kans["impact"] };
    });
  return { checks: c, score, kansen };
}

/* ------------------------------ De hele analyse ------------------------------ */

export function controleerKlaar(): void {
  if (!hasDataForSeo()) throw new Error("DataForSEO is niet gekoppeld. Vul je API-login en API-wachtwoord in bij Instellingen.");
}

// oordeel: optioneel, beslist per kandidaat (cid → true/false) of het een echte concurrent is; de Studio laat dat door Claude doen.
export type ConcurrentOordeel = (p: Vestiging, data: ProfielData, kandidaten: Concurrent[]) => Promise<Map<string, boolean> | null>;

export async function analyseerProfielen(
  profielen: Vestiging[],
  opties: { wachtOpReviewsTot: number; log?: (b: string) => void; oordeel?: ConcurrentOordeel }
): Promise<LokaalAnalyse> {
  controleerKlaar();
  const k = new Kosten();
  const eigen = new Set(profielen.map((p) => p.cid));

  // Reviews eerst aanvragen: die gaan via een wachtrij en zijn het traagst.
  const reviewTaken = await reviewsAanvragen(profielen, k).catch(() => new Map<string, string>());

  const ruw = await metLimiet(profielen, 3, async (p) => {
    try {
      const data = await profielInfo(p.cid, k);
      if (!data) throw new Error("Google gaf geen profiel terug voor dit ID.");
      const lat = p.lat ?? data.lat;
      const lng = p.lng ?? data.lng;
      const r = lat !== null && lng !== null && p.zoekwoorden.length ? await raster(lat, lng, p.cid, p.zoekwoorden, k) : { metingen: [], lijsten: [] };
      const site = await siteCheck(p.pagina_url, data.telefoon, data.uren);
      const kandidaten = kandidatenUit(r, p.cid, eigen);
      const oordeel = kandidaten.length && opties.oordeel ? await opties.oordeel(p, data, kandidaten).catch(() => null) : null;
      return { p, data, r, site, ...splitsConcurrenten(kandidaten, data, oordeel), fout: undefined as string | undefined };
    } catch (e) {
      return {
        p,
        data: null,
        r: { metingen: [], lijsten: [] } as RasterUit,
        site: { pagina_url: p.pagina_url, gelezen: false, telefoon_klopt: null, uren_site: null, uren_verschil: [] } as SiteCheck,
        concurrenten: [] as Concurrent[],
        anderen: [] as Concurrent[],
        fout: e instanceof Error ? e.message : String(e),
      };
    }
  });
  opties.log?.(`Profielen en Maps-metingen opgehaald (${profielen.length})`);

  // Wachten op de reviews, tot de tijdslimiet.
  const reviews = new Map<string, ReviewStats>();
  for (const p of profielen) {
    const id = reviewTaken.get(p.id);
    reviews.set(p.id, id ? { ...LEGE_REVIEWS, taak_id: id } : { ...LEGE_REVIEWS, status: "mislukt" });
  }
  while (Date.now() < opties.wachtOpReviewsTot && [...reviews.values()].some((r) => r.status === "wacht")) {
    await Promise.all(
      [...reviews.entries()]
        .filter(([, r]) => r.status === "wacht" && r.taak_id)
        .map(async ([id, r]) => reviews.set(id, await reviewsOphalen(r.taak_id!).catch(() => r)))
    );
    if ([...reviews.values()].some((r) => r.status === "wacht")) await pauze(8_000);
  }

  const categorieen = ruw.map((x) => x.data?.categorie ?? "");
  const profielenUit: ProfielAnalyse[] = ruw.map((x, i) => {
    const rv = reviews.get(x.p.id)!;
    if (!x.data)
      return { profiel_id: x.p.id, cid: x.p.cid, naam: x.p.naam, data: null, metingen: [], concurrenten: [], anderen: [], reviews: rv, site: x.site, checks: [], score: 0, kansen: [], teksten: null, fout: x.fout };
    const catAnderen = categorieen.filter((_, j) => j !== i);
    const b = beoordeel(x.p, x.data, x.r.metingen, x.concurrenten, rv, x.site, catAnderen, profielen.length > 1);
    return { profiel_id: x.p.id, cid: x.p.cid, naam: x.p.naam, data: x.data, metingen: x.r.metingen, concurrenten: x.concurrenten, anderen: x.anderen, reviews: rv, site: x.site, ...b, teksten: null };
  });

  const wacht = profielenUit.filter((p) => p.reviews.status === "wacht").length;
  return {
    gemaakt: new Date().toISOString(),
    kosten: Math.round(k.totaal * 10_000) / 10_000,
    ai: false,
    profielen: profielenUit,
    waarschuwing: wacht ? `De reviews van ${wacht} profiel(en) stonden nog in de wachtrij van DataForSEO. Klik later op "Reviews bijwerken".` : undefined,
  };
}

// Reviews die bij de analyse nog in de wachtrij stonden alsnog ophalen en de score opnieuw berekenen.
export async function werkReviewsBij(a: LokaalAnalyse, profielen: Vestiging[]): Promise<{ analyse: LokaalAnalyse; bijgewerkt: string[] }> {
  controleerKlaar();
  const bijgewerkt: string[] = [];
  const categorieen = a.profielen.map((x) => x.data?.categorie ?? "");
  for (const [i, pa] of a.profielen.entries()) {
    if (pa.reviews.status !== "wacht" || !pa.reviews.taak_id || !pa.data) continue;
    const rv = await reviewsOphalen(pa.reviews.taak_id);
    if (rv.status === "wacht") continue;
    const p = profielen.find((x) => x.id === pa.profiel_id);
    if (!p) continue;
    const b = beoordeel(p, pa.data, pa.metingen, pa.concurrenten, rv, pa.site, categorieen.filter((_, j) => j !== i), a.profielen.length > 1);
    Object.assign(pa, { reviews: rv, ...b });
    bijgewerkt.push(pa.profiel_id);
  }
  const wacht = a.profielen.filter((p) => p.reviews.status === "wacht").length;
  a.waarschuwing = wacht ? `De reviews van ${wacht} profiel(en) staan nog in de wachtrij van DataForSEO.` : undefined;
  return { analyse: a, bijgewerkt };
}
