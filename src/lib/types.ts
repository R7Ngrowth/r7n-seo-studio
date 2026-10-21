// Gegevens van R7N SEO Studio. Alles staat lokaal in de map data/ op de computer van de gebruiker.

export type Cms = "wordpress" | "shopify" | "anders" | "geen";

export interface Profiel {
  website: string; // https://www.voorbeeld.nl
  naam: string;
  onderwerp: string; // waar gaat het bedrijf over
  doelgroep: string;
  toon: string; // schrijfstijl-instructie
  taal: string;
  auteur: string;
  extra: string; // vaste wensen: woorden vermijden, merken noemen, …
}

export interface Koppeling {
  cms: Cms;
  wpUrl?: string;
  wpGebruiker?: string;
  wpWachtwoord?: string; // Application Password
  shopWinkel?: string; // winkel.myshopify.com
  shopClientId?: string; // Client ID van de app in het Shopify Dev Dashboard
  shopClientSecret?: string; // Client secret (begint met shpss_)
  shopToken?: string; // oude vaste sleutel (shpat_), alleen voor apps van vóór 2026
  shopBlogId?: string;
  // Ander platform: eigen koppeling (API) of zelf kopiëren en plakken
  andersManier?: "api" | "handmatig";
  apiUrl?: string;
  apiSleutel?: string;
}

export interface AiInstellingen {
  sleutel: string; // OpenRouter
  tekstmodel: string;
  beeldmodel: string;
  beeldstijl: string;
}

export interface Opmaak {
  plugin: boolean; // R7N Blog-plugin staat op de WordPress-site
  ctas: CtaSoort[];
}

export const CTA_SOORTEN = {
  advies: "Advies of keuzehulp",
  afspraak: "Afspraak of proefrit",
  service: "Service of onderhoud",
  contact: "Contact of offerte",
} as const;
export type CtaSoort = keyof typeof CTA_SOORTEN;

export interface DataForSeo {
  login: string; // API-login (meestal je e-mailadres)
  wachtwoord: string; // API-wachtwoord (niet je inlogwachtwoord)
}

export interface Instellingen {
  klaar: boolean; // wizard doorlopen
  dfs: DataForSeo;
  profiel: Profiel;
  koppeling: Koppeling;
  ai: AiInstellingen;
  opmaak: Opmaak;
  bijgewerkt: string;
}

export const MODELLEN = {
  tekst: [
    { id: "anthropic/claude-opus-5.5", naam: "Claude Opus 5.5", noot: "beste schrijver" },
    { id: "anthropic/claude-sonnet-5.5", naam: "Claude Sonnet 5.5", noot: "sneller en goedkoper" },
  ],
  beeld: [
    { id: "openai/gpt-5.4-image-2", naam: "OpenAI GPT-5.4 Image 2", noot: "nieuwste" },
    { id: "openai/gpt-5-image-mini", naam: "OpenAI GPT-5 Image Mini", noot: "goedkoopst" },
  ],
} as const;

export type BlogStatus = "concept" | "gepland" | "live" | "mislukt";

export interface Blog {
  id: string;
  onderwerp: string;
  zoekwoord: string;
  titel: string;
  adres: string; // slug
  intro: string; // samenvatting / excerpt
  tekst: string; // Markdown met eventueel bouwstenen
  meta: string;
  categorie: string;
  tags: string[];
  beeld: string | null; // bestandsnaam in data/beelden
  beeldPrompt: string;
  status: BlogStatus;
  bron: "zelf" | "kans";
  cmsId: string | null;
  geplandVoor: string | null;
  liveOp: string | null;
  liveUrl: string | null;
  fout: string | null;
  gemaakt: string;
}

export type Gat = "nieuw" | "aanvullen" | "gedekt";
export type Bedoeling = "weten" | "vergelijken" | "kopen" | "vinden";

export interface Kans {
  id: string;
  zoekwoord: string;
  thema: string;
  bedoeling: Bedoeling;
  gat: Gat;
  bestaandePagina: string | null;
  volume: number | null;
  moeilijkheid: number | null;
  score: number;
  waarom: string;
  titelIdee: string;
  invalshoek: string;
  opbouw: string[];
  verwant: string[];
  blogId: string | null;
}

export interface Kansenrapport {
  gemaakt: string;
  bron: "dataforseo" | "google";
  paginas: number;
  zoekwoorden: number;
  themas: { naam: string; uitleg: string }[];
  kansen: Kans[];
  melding: string | null;
}

export interface Logregel {
  tijd: string;
  soort: "setup" | "analyse" | "blog" | "publicatie" | "fout" | "lokaal";
  tekst: string;
}
