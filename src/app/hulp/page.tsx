import Link from "next/link";
import type { ReactNode } from "react";
import { Hero, Sectie } from "@/components/ui";

const STAPPEN: { titel: string; tekst: ReactNode }[] = [
  { titel: "Zoek kansen", tekst: <>Ga naar <Link href="/kansen" className="text-accent underline">Kansen</Link> en start de analyse. De studio leest je site en laat zien op welke onderwerpen je klanten zoeken en wat er nog ontbreekt. Hoe hoger de score, hoe meer een blog oplevert.</> },
  { titel: "Laat een blog schrijven", tekst: <>Klik bij een kans op <strong>Schrijf deze blog</strong>, of kies zelf een onderwerp bij <Link href="/nieuw" className="text-accent underline">Nieuwe blog</Link>. Claude schrijft in jouw schrijfstijl; OpenAI maakt de afbeelding. Dit duurt 2 à 3 minuten.</> },
  { titel: "Lees na en verbeter", tekst: <>Open de blog. Je ziet een voorbeeld zoals hij op je site komt en een kwaliteitscheck. Rode punten moeten eerst opgelost, oranje punten zijn advies. Pas tekst, titel, afbeelding of meta aan waar nodig.</> },
  { titel: "Zet hem op je site", tekst: <>Met een koppeling (WordPress, Shopify of eigen API) kies je <strong>Zet nu live</strong> of <strong>Inplannen</strong>: je site zet hem dan zelf op dat moment live. Zonder koppeling kopieer je de blog en plak je hem in je eigen platform.</> },
  { titel: "Herhaal in een vast ritme", tekst: <>Eén of twee blogs per week doet meer dan tien in één keer. Plan op maandag een paar blogs in voor de komende weken en kijk eens per maand opnieuw naar Kansen.</> },
];

const VRAGEN: [string, ReactNode][] = [
  ["Wat is OpenRouter en waarom heb ik het nodig?", <>Eén account waarmee de studio de beste AI gebruikt: Claude schrijft je blogs, OpenAI maakt de afbeeldingen. Je zet zelf tegoed op je account, betaalt per gebruik en zet een maandlimiet op je sleutel. Zonder OpenRouter kan de studio niet schrijven. Uitleg en stappen staan bij <Link href="/instellingen" className="text-accent underline">Instellingen</Link>.</>],
  ["Wat is DataForSEO en heb ik het nodig?", <>DataForSEO geeft echte Google-cijfers: hoeveel mensen per maand op een zoekwoord zoeken en hoe moeilijk het is om bovenaan te komen. Daardoor kiest de studio de onderwerpen die echt bezoekers opleveren. Het is optioneel (zonder werkt de studio op Google-suggesties), maar aangeraden zodra je serieus met SEO aan de slag gaat. Eerste storting minimaal $50, een analyse kost $0,10–0,20.</>],
  ["Wat kost het?", <>De studio is gratis. Je betaalt alleen wat je gebruikt bij OpenRouter (ongeveer $0,10–0,40 per blog met afbeelding) en, als je dat wilt, bij DataForSEO (ongeveer $0,10–0,20 per analyse). Zet een maandlimiet op je OpenRouter-sleutel.</>],
  ["Waar staan mijn gegevens?", <>Alles staat op je eigen computer, in de map <code className="mono">data/</code>: je instellingen, blogs en afbeeldingen. Maak daar af en toe een kopie van. Niemand anders, ook R7N niet, kan erbij.</>],
  ["Moet mijn computer aan blijven?", <>Alleen terwijl je werkt. Ingeplande blogs zet je website zelf live.</>],
  ["De blog ziet er kaal uit op mijn site", <>Installeer de gratis WordPress-plugin <strong>R7N Blog</strong> en zet bij Instellingen &quot;De plugin R7N Blog staat op mijn site&quot; aan. Dan krijgen al je blogs een vaste opmaak met inhoudsopgave, actieblokken en uitklapbare vragen.</>],
  ["WordPress zegt dat de inlog niet klopt", <>Gebruik de gebruikersnaam van het account waar je het Application Password hebt gemaakt (vaak je e-mailadres), niet de naam van het wachtwoord.</>],
  ["Wat doet Lokaal?", <>Lokaal analyseert je Google Bedrijfsprofielen (één per vestiging). Je voegt ze toe bij <Link href="/lokaal/profielen" className="text-accent underline">Lokaal → Profielen</Link>, met je vestigingspagina en een paar zoekwoorden zoals &quot;bakker&quot;. De studio meet je positie in Google Maps vanaf vier punten op ±2 km rond de winkel (zo zoekt een klant vanuit huis), vergelijkt je met de concurrenten boven je, leest je nieuwste reviews en checkt of telefoon en openingstijden gelijk zijn aan je site. Je krijgt een score, de vijf grootste kansen en kant-en-klare teksten: een nieuwe beschrijving, Google-berichten en antwoorden op open reviews. Lokaal heeft DataForSEO nodig en kost ongeveer $0,03 per vestiging.</>],
  ["Ik heb meerdere websites of klanten", <>Maak per website een eigen kopie van de studio-map. Wil je alles op één plek zien en voor meerdere klanten werken? Dan is een eigen Mission Control de volgende stap.</>],
];

export default function Hulp() {
  return (
    <>
      <Hero nummer="IX" label="Hoe werkt het" title="Hoe werkt het" lines={["Van kans tot blog op je site in vijf stappen."]} />
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {STAPPEN.map((s, i) => (
          <li key={s.titel} className="kaart p-5">
            <span className="check-nr">{i + 1}</span>
            <h2 className="kop mt-3">{s.titel}</h2>
            <p className="mt-1.5 text-sm text-muted">{s.tekst}</p>
          </li>
        ))}
      </ol>
      <Sectie nummer="IX" titel="Veelgestelde vragen" />
      <div className="kaart divide-y divide-line">
        {VRAGEN.map(([v, a]) => (
          <details key={v} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-medium">{v}</summary>
            <p className="mt-2 text-sm text-muted">{a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-center text-[11px] text-muted">R7N SEO Studio · gemaakt door R7N Growth · zie LICENSE.md voor de gebruiksvoorwaarden</p>
    </>
  );
}
