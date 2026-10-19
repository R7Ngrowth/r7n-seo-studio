import type { Blog, Cms } from "./types";

// Kwaliteitscheck vóór publiceren. "verplicht" houdt publiceren en inplannen tegen; de rest is advies.
export interface Check {
  id: string;
  label: string;
  ok: boolean;
  verplicht: boolean;
  uitleg: string;
}

const woorden = (t: string) => t.replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean).length;

function bevat(tekst: string, zoekwoord: string): boolean {
  const t = tekst.toLowerCase();
  const kw = zoekwoord.toLowerCase().replace(/[?!.,:;"]/g, "").trim();
  if (!kw || t.includes(kw)) return true;
  const delen = kw.split(/\s+/).filter((w) => w.length > 3);
  return delen.length > 0 && delen.filter((w) => t.includes(w)).length / delen.length >= 0.6;
}

export function kwaliteit(b: Blog, site: string, cms: Cms, plugin: boolean, adresVrij: boolean | null): Check[] {
  const tekst = b.tekst;
  const eerste = tekst.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith("#") && !p.trim().startsWith("[")) ?? "";
  let domein = "";
  try {
    domein = new URL(site).hostname.replace(/^www\./, "");
  } catch {}
  const intern = [...tekst.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].filter((m) => domein && m[1].includes(domein)).length;
  const h2 = (tekst.match(/^##\s/gm) ?? []).length;
  const meta = b.meta.trim().length;
  const n = woorden(tekst);

  const lijst: Check[] = [
    { id: "titel", label: "Titel", ok: b.titel.trim().length >= 20, verplicht: true, uitleg: b.titel ? `${b.titel.length} tekens` : "ontbreekt" },
    { id: "titellengte", label: "Titel max. 65 tekens", ok: b.titel.length > 0 && b.titel.length <= 65, verplicht: false, uitleg: "langer wordt in Google afgekapt" },
    { id: "kw-titel", label: "Zoekwoord in de titel", ok: bevat(b.titel, b.zoekwoord), verplicht: false, uitleg: `"${b.zoekwoord}"` },
    { id: "kw-intro", label: "Zoekwoord in de eerste alinea", ok: bevat(eerste, b.zoekwoord), verplicht: false, uitleg: "Google en AI lezen de opening het zwaarst" },
    { id: "meta", label: "Meta description 120–160 tekens", ok: meta >= 120 && meta <= 160, verplicht: meta === 0, uitleg: meta ? `${meta} tekens` : "ontbreekt" },
    { id: "lengte", label: "Minstens 800 woorden", ok: n >= 800, verplicht: n < 300, uitleg: `${n} woorden` },
    { id: "koppen", label: "Minstens 4 tussenkoppen", ok: h2 >= 4, verplicht: false, uitleg: `${h2} gevonden` },
    { id: "faq", label: "Veelgestelde vragen", ok: /^##\s.*vragen/im.test(tekst), verplicht: false, uitleg: "kans op een FAQ-resultaat in Google" },
    { id: "links", label: "Minstens 2 interne links", ok: intern >= 2, verplicht: false, uitleg: `${intern} naar ${domein || "je site"}` },
    { id: "beeld", label: "Uitgelichte afbeelding", ok: !!b.beeld, verplicht: cms === "wordpress" || cms === "shopify", uitleg: b.beeld ? "aanwezig, alt-tekst = titel" : "maak eerst een afbeelding" },
  ];
  if (cms === "wordpress") lijst.push({ id: "categorie", label: "Categorie gekozen", ok: !!b.categorie, verplicht: false, uitleg: b.categorie || "geen (komt in Uncategorized)" });
  if (plugin) lijst.push({ id: "cta", label: "CTA-blok in de tekst", ok: /\[r7n_cta\s/.test(tekst), verplicht: false, uitleg: "anders zet de plugin er zelf een halverwege" });
  if (adresVrij !== null) lijst.push({ id: "adres", label: "Adres is nog vrij", ok: adresVrij, verplicht: true, uitleg: adresVrij ? `/${b.adres}/` : `/${b.adres}/ bestaat al op je site` });
  return lijst;
}

export const blokkerend = (lijst: Check[]) => lijst.filter((c) => c.verplicht && !c.ok);
