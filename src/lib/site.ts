import type { Cms } from "./types";

// Een website uitlezen: sitemap vinden, pagina's ophalen en er leesbare tekst, titels en koppen uit halen.
const AGENT = "Mozilla/5.0 (compatible; R7N-SEO-Studio/1.0)";

export interface Pagina {
  url: string;
  titel: string;
  beschrijving: string;
  koppen: string[];
  woorden: number;
  tekst: string;
}

// Schoon adres: zonder volgparameters (?gclid=…) en zonder # of slash aan het eind.
export function normaal(url: string): string {
  const u = url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export async function haal(url: string, ms = 15_000): Promise<{ html: string; url: string; kop: Headers } | null> {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": AGENT, Accept: "text/html,application/xml;q=0.9,*/*;q=0.8" }, signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return { html: await res.text(), url: res.url || url, kop: res.headers };
  } catch {
    return null;
  }
}

const ENTITEITEN: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", euro: "€", eacute: "é", euml: "ë", iuml: "ï" };

export function ontcijfer(t: string): string {
  return t
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITEITEN[n.toLowerCase()] ?? m);
}

const schoon = (t: string) => ontcijfer(t.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

// Haalt de inhoud uit een pagina: menu, kop- en voettekst, scripts en formulieren gaan eruit.
export function inhoudVan(html: string): { titel: string; beschrijving: string; koppen: string[]; tekst: string } {
  const titel = schoon(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const beschrijving = ontcijfer(
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
      ""
  ).trim();
  const lijf = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|form|aside)\b[\s\S]*?<\/\1>/gi, " ");
  const koppen: string[] = [];
  const delen: string[] = [];
  for (const m of lijf.matchAll(/<(h[1-4]|p|li|blockquote|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = schoon(m[2]);
    if (!t) continue;
    if (/^h/i.test(m[1])) {
      if (t.length > 2 && t.length < 140) koppen.push(t);
      delen.push(`\n${t}`);
    } else if (t.length > 30) delen.push(t);
  }
  return { titel, beschrijving, koppen: [...new Set(koppen)].slice(0, 20), tekst: [...new Set(delen)].join("\n").trim() };
}

// De menu-items van een pagina: de namen van de productgroepen en diensten zoals de site ze zelf noemt.
// Eerst uit <nav>/<header>; staat daar niets bruikbaars, dan alle korte interne linkteksten.
export function menuVan(html: string, basis: string): string[] {
  const host = (() => {
    try {
      return new URL(normaal(basis)).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const uit = (deel: string) => {
    const namen: string[] = [];
    for (const m of deel.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const href = m[1];
      if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
      if (/^https?:\/\//i.test(href) && host && !href.replace(/^https?:\/\/(www\.)?/i, "").startsWith(host)) continue;
      const t = schoon(m[2]);
      if (t.length < 3 || t.length > 40 || /\d{2,}/.test(t)) continue;
      namen.push(t);
    }
    return [...new Set(namen)];
  };
  const navs = [...html.matchAll(/<(nav|header)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]).join("\n");
  const uitNav = uit(navs);
  return (uitNav.length >= 4 ? uitNav : uit(html)).slice(0, 80);
}

// De secties van de site uit de sitemap: per eerste padsegment de onderliggende pagina's ("fietstype" → stadsfiets, bakfiets, …).
// Zo ziet de analyse ook productgroepen die niet in het menu staan.
export function sectiesVan(urls: string[]): { sectie: string; items: string[] }[] {
  const per = new Map<string, Set<string>>();
  for (const u of urls) {
    let delen: string[];
    try {
      delen = new URL(u).pathname.split("/").filter(Boolean).map((d) => decodeURIComponent(d).replace(/[-_]+/g, " ").trim());
    } catch {
      continue;
    }
    if (delen.length !== 2) continue;
    if (!per.has(delen[0])) per.set(delen[0], new Set());
    per.get(delen[0])!.add(delen[1]);
  }
  return [...per]
    .filter(([, items]) => items.size >= 2 && items.size <= 60)
    .map(([sectie, items]) => ({ sectie, items: [...items].slice(0, 40) }))
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 12);
}

export function herkenCms(html: string, kop?: Headers): Cms {
  const h = html.toLowerCase();
  if (h.includes("cdn.shopify.com") || h.includes("shopify.theme") || kop?.get("x-shopid")) return "shopify";
  if (h.includes("/wp-content/") || h.includes("/wp-json/") || /<meta[^>]+generator[^>]+wordpress/i.test(html) || (kop?.get("link") ?? "").includes("api.w.org"))
    return "wordpress";
  return "geen";
}

// Alle pagina-adressen uit de sitemap(s). Kijkt eerst in robots.txt, dan op de gebruikelijke plekken.
export async function sitemap(basis: string, max = 600): Promise<string[]> {
  const b = normaal(basis);
  const kandidaten = new Set<string>();
  const robots = await haal(`${b}/robots.txt`, 8_000);
  for (const m of robots?.html.matchAll(/^\s*sitemap:\s*(\S+)/gim) ?? []) kandidaten.add(m[1].trim());
  ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"].forEach((p) => kandidaten.add(b + p));

  const gezien = new Set<string>();
  const urls = new Set<string>();
  const wachtrij = [...kandidaten].map((u) => ({ u, diepte: 0 }));
  while (wachtrij.length && urls.size < max) {
    const { u, diepte } = wachtrij.shift()!;
    if (gezien.has(u)) continue;
    gezien.add(u);
    const r = await haal(u, 12_000);
    if (!r || !/<(urlset|sitemapindex)/i.test(r.html)) continue;
    const locs = [...r.html.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/gi)].map((m) => ontcijfer(m[1]));
    if (/<sitemapindex/i.test(r.html)) {
      if (diepte < 2) wachtrij.push(...locs.map((x) => ({ u: x, diepte: diepte + 1 })));
    } else locs.forEach((x) => urls.add(x.replace(/\/+$/, "")));
    if (urls.size && diepte === 0 && !/<sitemapindex/i.test(r.html)) break;
  }
  return [...urls].slice(0, max);
}

const diepte = (u: string) => {
  try {
    return new URL(u).pathname.split("/").filter(Boolean).length;
  } catch {
    return 9;
  }
};
const OVERSLAAN = /\/(wp-content|wp-json|tag|category|categorie|author|feed|cart|checkout|winkelwagen|account|login|privacy|cookie|voorwaarden|algemene-voorwaarden)\b|\?|\.(jpg|png|webp|pdf|xml)$/i;

// Leest de belangrijkste pagina's: de homepage en de minst diepe pagina's uit de sitemap.
export async function leesSite(basis: string, max = 20): Promise<{ paginas: Pagina[]; alleUrls: string[]; menu: string[] }> {
  const b = normaal(basis);
  const alleUrls = (await sitemap(b)).filter((u) => !OVERSLAAN.test(u));
  const keuze = [b, ...alleUrls.filter((u) => u !== b).sort((x, y) => diepte(x) - diepte(y))].slice(0, max);
  const paginas: Pagina[] = [];
  let menu: string[] = [];
  for (let i = 0; i < keuze.length; i += 5) {
    const ronde = await Promise.all(
      keuze.slice(i, i + 5).map(async (url): Promise<Pagina | null> => {
        const r = await haal(url);
        if (!r) return null;
        if (url === b) menu = menuVan(r.html, b);
        const inh = inhoudVan(r.html);
        return { url, ...inh, woorden: inh.tekst.split(/\s+/).filter(Boolean).length };
      })
    );
    paginas.push(...ronde.filter((p): p is Pagina => !!p));
  }
  return { paginas, alleUrls, menu };
}

// Leesbare titel uit een adres, voor pagina's die we niet ophalen.
export function titelUitUrl(u: string): string {
  const deel = new URL(u).pathname.split("/").filter(Boolean).pop() ?? "";
  const t = decodeURIComponent(deel).replace(/[-_]+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Home";
}
