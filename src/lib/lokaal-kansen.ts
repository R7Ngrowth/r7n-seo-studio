// Kansen per bedrijfsprofiel, zo concreet mogelijk: waarom het telt, wat je precies doet (waar je klikt) en de tekst om te plakken.
// Pure functie: werkt alleen op de meting zelf (zelfde code als in R7N Mission Control).
import type { Check, ProfielAnalyse } from "./lokaal";

export interface KansDetail {
  id: string;
  titel: string;
  impact: "hoog" | "middel" | "laag";
  punten: number;
  waarom: string;
  stappen: string[];
  kopie?: string; // de tekst om in Google te plakken
  kopieLabel?: string;
}

export interface ExtraKans {
  titel: string;
  actie: string;
}

const BEWERK = "Open je profiel: zoek je bedrijfsnaam in Google terwijl je bent ingelogd met het beheerdersaccount (of ga naar business.google.com) en klik op Profiel bewerken.";
const DAGEN: Record<string, string> = { ma: "maandag", di: "dinsdag", wo: "woensdag", do: "donderdag", vr: "vrijdag", za: "zaterdag", zo: "zondag" };
const impact = (mis: number): KansDetail["impact"] => (mis >= 6 ? "hoog" : mis >= 3 ? "middel" : "laag");
const plaatsUit = (adres: string) => /\d{4}\s?[A-Z]{2}\s+(.+)$/.exec(adres)?.[1]?.trim() ?? "";

export function kansenVoor(
  p: ProfielAnalyse,
  extra: { pagina_url?: string; categorieen?: string[]; link?: string; beschrijving?: string } = {}
): { kansen: KansDetail[]; meer: ExtraKans[] } {
  const d = p.data;
  if (!d) return { kansen: [], meer: [] };
  const plaats = plaatsUit(d.adres);
  const conc = p.concurrenten;
  const top = conc[0];
  const kansen: KansDetail[] = [];
  const mis = (c: Check) => Math.round((c.gewicht - c.punten) * 10) / 10;

  for (const c of p.checks.filter((x) => x.ok === false)) {
    const m = mis(c);
    const basis = { id: c.id, punten: m, impact: impact(m) };
    switch (c.id) {
      case "beschrijving":
        kansen.push({
          ...basis,
          titel: "Schrijf een volledige beschrijving",
          waarom: `Je beschrijving is nu ${d.beschrijving.length ? `${d.beschrijving.length} tekens` : "leeg"}. Google gebruikt deze tekst om te bepalen bij welke zoekopdrachten je verschijnt; 600–750 tekens met plaats, merken en diensten werkt het best.`,
          stappen: [BEWERK, "Ga naar Bedrijfsgegevens → Beschrijving.", "Vervang de tekst door de nieuwe beschrijving hieronder en klik op Opslaan. Google controleert hem binnen een paar dagen."],
          kopie: extra.beschrijving ?? p.teksten?.beschrijving,
          kopieLabel: "Nieuwe beschrijving",
        });
        break;
      case "extra_cat": {
        const cats = extra.categorieen?.length ? extra.categorieen : [...new Set(conc.map((x) => x.categorie).filter((x) => x && x !== d.categorie))].slice(0, 3);
        kansen.push({
          ...basis,
          titel: cats.length ? `Voeg ${cats.length === 1 ? "de categorie" : "de categorieën"} ${cats.join(", ")} toe` : "Voeg extra categorieën toe",
          waarom: `Je hebt nu alleen "${d.categorie}". Met extra categorieën verschijn je ook bij zoekopdrachten als "${(cats[0] ?? "fietsenmaker").toLowerCase()} ${plaats}". De concurrenten boven je gebruiken ${[...new Set(conc.map((x) => x.categorie))].join(", ") || "andere categorieën"}.`,
          stappen: [BEWERK, "Ga naar Bedrijfscategorie → Nog een categorie toevoegen.", `Typ ${cats.map((x) => `"${x}"`).join(" en ") || "de categorie"}, kies hem uit de lijst en klik op Opslaan.`, "Kies alleen wat de winkel echt doet."],
          kopie: cats.join("\n") || undefined,
          kopieLabel: "Categorieën",
        });
        break;
      }
      case "hoofdcat":
        kansen.push({ ...basis, titel: "Controleer je hoofdcategorie", waarom: c.actie, stappen: [BEWERK, "Ga naar Bedrijfscategorie en zet de belangrijkste categorie bovenaan (als hoofdcategorie).", "Zet de huidige als extra categorie."] });
        break;
      case "link":
        kansen.push({
          ...basis,
          titel: "Laat de website-link naar je eigen vestigingspagina wijzen",
          waarom: `Nu wijst de link naar ${d.website.replace(/^https?:\/\/(www\.)?/, "") || "niets"}. Een link naar de pagina van deze vestiging helpt Google profiel en pagina te koppelen, en met de meetcode zie je in Google Analytics hoeveel bezoek uit je profiel komt.`,
          stappen: [BEWERK, "Ga naar Contact → Website.", "Plak de link hieronder en klik op Opslaan."],
          kopie: extra.link ?? extra.pagina_url,
          kopieLabel: "Website-link",
        });
        break;
      case "afspraak":
        kansen.push({
          ...basis,
          titel: "Zet een afspraak-link in je profiel",
          waarom: "Met een afspraak-link verschijnt er een knop Afspraak maken in je profiel. Klanten plannen dan direct een werkplaatsafspraak of proefrit.",
          stappen: [BEWERK, "Ga naar Contact → Afspraaklinks → Afspraaklink toevoegen.", "Plak de link naar je werkplaatsplanner of proefritpagina en klik op Opslaan."],
        });
        break;
      case "uren": {
        const v = p.site.uren_verschil.map((x) => `${DAGEN[x]}: site ${p.site.uren_site?.[x]?.join(", ") || "gesloten"}`).join("; ");
        kansen.push({
          ...basis,
          titel: "Zet de openingstijden gelijk aan je website",
          waarom: "Verschillende tijden in Google en op je site kosten vertrouwen; Google kan het profiel zelfs lager zetten.",
          stappen: ["Vraag bij de winkel na welke tijden kloppen.", BEWERK, `Ga naar Openingstijden en pas aan: ${v}.`, "Pas de site aan als die juist niet klopt."],
        });
        break;
      }
      case "telefoon":
        kansen.push({ ...basis, titel: "Zet hetzelfde telefoonnummer in je profiel als op je site", waarom: c.actie, stappen: [BEWERK, "Ga naar Contact → Telefoonnummer en zet het nummer van je vestigingspagina erin."] });
        break;
      case "fotos": {
        const doel = Math.max(20, top?.fotos ? Math.min(top.fotos, 40) : 20);
        kansen.push({
          ...basis,
          titel: `Voeg ${Math.max(0, doel - d.fotos)} foto's toe (nu ${d.fotos})`,
          waarom: `Profielen met veel echte foto's krijgen meer klikken en routeverzoeken.${top?.fotos ? ` ${top.naam} heeft er ${top.fotos}.` : ""}`,
          stappen: [
            "Maak liggende foto's met goed licht (geen stockfoto's, geen tekst erop).",
            "Wat: de gevel met naam, de winkel binnen, de werkplaats, het team, en 3 tot 5 populaire fietsen.",
            "Open je profiel, klik op Foto toevoegen en upload ze. Voeg daarna elke maand een paar nieuwe toe.",
          ],
        });
        break;
      }
      case "aantal_reviews": {
        const ref = /±(\d+)/.exec(c.uitleg)?.[1];
        const perMaand = ref ? Math.max(4, Math.ceil((Number(ref) - d.reviews) / 12)) : 6;
        kansen.push({
          ...basis,
          titel: `Vraag om reviews: ${perMaand} nieuwe per maand`,
          waarom: `Je hebt ${d.reviews} reviews${ref ? `, de concurrenten boven je gemiddeld ${ref}` : ""}. Het aantal (en hoe recent ze zijn) is een van de sterkste signalen voor je positie in Google Maps.`,
          stappen: [
            "Open je profiel en klik op Vraag om reviews; kopieer de link.",
            "Stuur de link na elke aankoop of reparatie (mail of sms), of zet een QR-code bij de kassa en op de bon.",
            "Vraag het persoonlijk bij tevreden klanten: dat werkt het best.",
          ],
        });
        break;
      }
      case "maps": {
        const zwak = p.metingen.filter((x) => (x.positie ?? 21) > 5);
        const woord = [...new Set(zwak.map((x) => x.zoekwoord))][0];
        const kant = zwak.filter((x) => x.zoekwoord === woord).map((x) => ({ N: "noorden", O: "oosten", Z: "zuiden", W: "westen" })[x.punt]);
        kansen.push({
          ...basis,
          titel: woord ? `Beter gevonden worden op "${woord}"` : "Beter gevonden worden in Google Maps",
          waarom: woord ? `Op "${woord}" sta je vanaf het ${kant.join(" en ")} buiten de top 5.` : c.uitleg,
          stappen: [
            woord ? `Noem "${woord}" en "${plaats}" in je beschrijving en in de koptekst van je vestigingspagina.` : "Noem je diensten en plaats in je beschrijving.",
            woord ? `Voeg "${woord}" toe als categorie of dienst als dat nog niet zo is.` : "Controleer je categorieën.",
            "Meer reviews en foto's tellen hier het zwaarst mee (zie hierboven).",
          ],
        });
        break;
      }
    }
  }
  // Lang genoeg, maar verouderd of beter te maken: dan toch een nieuwe beschrijving voorstellen.
  const nieuw = extra.beschrijving ?? p.teksten?.beschrijving;
  const observaties = [...(p.teksten?.observaties ?? [])];
  const overBeschrijving = observaties.findIndex((o) => /beschrijving/i.test(o));
  if (!kansen.some((k) => k.id === "beschrijving") && nieuw && nieuw.trim() !== d.beschrijving.trim() && extra.beschrijving) {
    // Wat de agent over de huidige beschrijving opviel, is meteen het waarom.
    const reden = overBeschrijving >= 0 ? observaties.splice(overBeschrijving, 1)[0] : null;
    kansen.push({
      id: "beschrijving",
      titel: "Werk de beschrijving bij",
      impact: "middel",
      punten: 0,
      waarom: reden ?? "De huidige beschrijving is lang genoeg, maar kan beter (bijvoorbeeld verouderde informatie of ontbrekende diensten). De nieuwe tekst hieronder is bijgewerkt.",
      stappen: [BEWERK, "Ga naar Bedrijfsgegevens → Beschrijving.", "Vervang de tekst door de nieuwe beschrijving hieronder en klik op Opslaan."],
      kopie: nieuw,
      kopieLabel: "Nieuwe beschrijving",
    });
  }
  kansen.sort((a, b) => b.punten - a.punten || (a.impact === "middel" ? -1 : 1));

  // Meer kansen uit de vergelijking met concurrenten en wat de AI opviel.
  const meer: ExtraKans[] = [];
  const meerFotos = conc.filter((x) => (x.fotos ?? 0) > d.fotos * 2);
  if (meerFotos.length && !kansen.some((k) => k.id === "fotos")) meer.push({ titel: `${meerFotos[0].naam} heeft ${meerFotos[0].fotos} foto's (jij ${d.fotos})`, actie: "Voeg elke maand 3 tot 5 nieuwe echte foto's toe." });
  const beter = conc.filter((x) => (x.sterren ?? 0) > (d.sterren ?? 0) && (x.reviews ?? 0) > d.reviews);
  if (beter.length) meer.push({ titel: `${beter[0].naam} scoort hoger (${beter[0].sterren}★ uit ${beter[0].reviews} reviews)`, actie: "Kijk wat klanten daar noemen in de reviews; dat wil je zelf ook horen. Vraag tevreden klanten actief om een review." });
  if (!d.diensten.length) meer.push({ titel: "Er staan geen diensten in je profiel", actie: "Profiel bewerken → Diensten: voeg o.a. onderhoud, reparatie, proefrit, fietslease en verzekering toe." });
  for (const o of observaties) {
    // Eerste zin als kop, de rest als actie. Alleen splitsen op ". " gevolgd door een hoofdletter (niet bij 4.9 of een dubbele punt).
    const m = /^(.+?\.)\s+([A-Z][\s\S]*)$/.exec(o.trim());
    meer.push(m ? { titel: m[1].replace(/\.$/, ""), actie: m[2] } : { titel: o.trim().replace(/\.$/, ""), actie: "" });
  }
  return { kansen, meer: meer.slice(0, 6) };
}
