import { json } from "./ai";
import { zonderBouwstenen } from "./markdown";
import { plek } from "./plek";
import { sitemap, titelUitUrl } from "./site";
import { CTA_SOORTEN, type Instellingen, type Kans } from "./types";

// Schrijft een complete blog in de stem van het bedrijf, met een vaste opbouw die goed werkt voor Google, AI-zoekmachines én lezers.
export interface Geschreven {
  titel: string;
  adres: string;
  intro: string;
  tekst: string;
  meta: string;
  categorie: string;
  tags: string[];
  beeldPrompt: string;
}

const UITSLUITEN = /\/(wp-content|tag|category|categorie|author|feed|cart|checkout|account|privacy|cookie|voorwaarden)\b|\?/i;

// Linkdoelen: bestaande blogs en de belangrijkste pagina's van de site.
async function linkdoelen(i: Instellingen) {
  const p = plek(i.koppeling);
  const blogs = await (p?.berichten() ?? Promise.resolve([])).catch(() => []);
  const blogUrls = new Set(blogs.map((b) => b.url.replace(/\/$/, "")));
  const basis = i.profiel.website.replace(/\/$/, "");
  const paginas = (await sitemap(basis).catch(() => [] as string[]))
    .filter((u) => u.startsWith(basis) && u !== basis && !UITSLUITEN.test(u) && !blogUrls.has(u))
    .filter((u) => new URL(u).pathname.split("/").filter(Boolean).length <= 2)
    .slice(0, 40)
    .map((u) => ({ titel: titelUitUrl(u), url: `${u}/` }));
  return { blogs, paginas, categorieen: await (p?.categorieen() ?? Promise.resolve([])).catch(() => []) };
}

function regels(i: Instellingen): string {
  const { opmaak } = i;
  const bouw = opmaak.plugin && opmaak.ctas.length;
  return `OPBOUW (zo wordt hij ook op de site getoond):
1. Begin met twee korte alinea's zonder kop. Het zoekwoord staat in de eerste zin. Vertel wat de lezer gaat ontdekken.
2. Dan 4 tot 6 secties met een ## kop die de vraag van de lezer beantwoordt. ### alleen voor echte deelonderwerpen.
3. Alinea's van 2 tot 4 zinnen. Gebruik lijstjes (- of 1.) bij stappen, kenmerken of voor- en nadelen; begin elk punt met een **vet** kernwoord.
4. Een sectie "## Veelgestelde vragen" met 3 tot 5 vragen als ### kop en een direct antwoord van 2 of 3 zinnen.
5. Sluit af met een ## kop die samenvat en de lezer uitnodigt om contact op te nemen of langs te komen, in de stem van het bedrijf.
6. Zet 3 tot 5 links in de lopende tekst naar de pagina's en blogs hieronder, met een ankertekst die zegt waar de link heen gaat. Alleen adressen uit die lijsten.
7. Geen prijzen van losse producten en geen voorraadbeloftes; algemene prijsindicaties mogen.
${
  bouw
    ? `8. Bouwstenen voor de site, elk op een eigen regel en precies zo geschreven:
   - één keer na de tweede of derde sectie: [r7n_cta type="X"], waarbij X één is van: ${opmaak.ctas.map((c) => `${c} (${CTA_SOORTEN[c]})`).join(", ")}
   - één keer waar het echt helpt: [r7n_tip titel="Tip van onze specialisten"]Eén concrete tip in één alinea.[/r7n_tip]
   - verder geen code of HTML.`
    : "8. Geen code, HTML of shortcodes."
}`;
}

export async function schrijf(i: Instellingen, onderwerp: string, kans?: Kans | null): Promise<Geschreven> {
  const { profiel, ai } = i;
  const doelen = await linkdoelen(i);
  const brief = kans
    ? `\nBRIEF:\n- Zoekwoord: "${kans.zoekwoord}" (in titel, eerste zin en minstens één ## kop)\n- Invalshoek: ${kans.invalshoek}\n- Titelidee (mag beter): ${kans.titelIdee}\n- Tussenkoppen: ${kans.opbouw.join(" | ")}\n- Verwante zoekwoorden: ${kans.verwant.join(", ")}`
    : "";

  const r = await json<Geschreven>(
    ai.sleutel,
    ai.tekstmodel,
    [
      {
        role: "system",
        content: `Je schrijft blogs voor ${profiel.naam}: ${profiel.onderwerp}
Doelgroep: ${profiel.doelgroep}
Taal: ${profiel.taal}
Schrijfstijl: ${profiel.toon}
${profiel.extra ? `Vaste wensen: ${profiel.extra}\n` : ""}
Schrijf een complete blog van 1000 tot 1500 woorden in Markdown, zonder # kop (de titel staat apart). Hij moet goed scoren in Google en in AI-zoekmachines en de lezer helpen een beslissing te nemen.
${regels(i)}
${brief}

PAGINA'S VAN DE SITE:
${doelen.paginas.map((p) => `- ${p.titel} → ${p.url}`).join("\n") || "(geen)"}
BLOGS OP DE SITE:
${doelen.blogs.map((b) => `- ${b.titel} → ${b.url}`).join("\n") || "(geen)"}
${doelen.categorieen.length ? `\nCATEGORIE: kies precies één uit: ${doelen.categorieen.join(", ")}` : ""}

Velden:
- titel: hooguit 65 tekens, zoekwoord vooraan
- adres: 3 tot 6 woorden, kleine letters, gescheiden door streepjes
- intro: samenvatting van 2 zinnen
- meta: 140 tot 155 tekens met het zoekwoord en een reden om te klikken
- tags: 3 tot 6
- beeldPrompt: Engelse prompt voor een realistische, rustige foto die past bij het artikel, zonder tekst of logo's${ai.beeldstijl ? `. Stijl: ${ai.beeldstijl}` : ""}
Antwoord alleen met JSON: {"titel":"…","adres":"…","intro":"…","tekst":"…","meta":"…","categorie":"…","tags":["…"],"beeldPrompt":"…"}`,
      },
      {
        role: "user",
        content: `Onderwerp: ${onderwerp}${doelen.blogs.length ? `\nVermijd overlap met de blogs die er al staan.` : ""}`,
      },
    ],
    9000
  );
  if (!r.titel || !r.tekst) throw new Error("De blog kwam onvolledig terug. Probeer het opnieuw.");
  const adres = (r.adres || r.titel)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    titel: r.titel.trim(),
    adres,
    intro: (r.intro ?? "").trim(),
    tekst: i.opmaak.plugin ? r.tekst.trim() : zonderBouwstenen(r.tekst),
    meta: (r.meta ?? "").trim(),
    categorie: doelen.categorieen.find((c) => c.toLowerCase() === (r.categorie ?? "").toLowerCase().trim()) ?? doelen.categorieen[0] ?? "",
    tags: Array.isArray(r.tags) ? r.tags.slice(0, 6) : [],
    beeldPrompt: (r.beeldPrompt ?? "").trim(),
  };
}
