import { ExternalLink, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import type { Cms } from "@/lib/types";

// Uitklapbare stap-voor-stap-uitleg in de wizard en bij Instellingen.
function Blok({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <details className="melding melding-normaal mt-3 text-sm">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 font-medium">
        <Lightbulb className="h-4 w-4 shrink-0 text-warn" aria-hidden />
        {titel}
      </summary>
      <div className="space-y-2 border-t border-line px-4 py-3 text-muted">{children}</div>
    </details>
  );
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent underline underline-offset-2">
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

export function OpenRouterUitleg() {
  return (
    <Blok titel="Wat is OpenRouter, en hoe maak ik een sleutel?">
      <p>
        <strong>Wat het is:</strong> OpenRouter is één account waarmee de studio de beste AI-modellen gebruikt: <strong>Claude</strong> (Anthropic) schrijft je blogs
        en <strong>OpenAI</strong> maakt de afbeeldingen. Je hebt dus niet bij elk AI-bedrijf een apart account nodig.
      </p>
      <p>
        <strong>Wat het kost:</strong> je zet zelf tegoed op je account en betaalt alleen wat je gebruikt. Een blog met afbeelding kost ruwweg $0,10–$0,40, een
        kansen-analyse $0,05–$0,20. Er is geen abonnement.
      </p>
      <p>
        <strong>Waarom een limiet:</strong> op je sleutel zet je een maandlimiet. Dan kan de studio nooit meer uitgeven dan jij wilt.
      </p>
      <ol className="list-decimal space-y-1.5 pl-4">
        <li>
          Maak een account op <Ext href="https://openrouter.ai">openrouter.ai</Ext> en zet bij <strong>Credits</strong> wat tegoed op je account (bijv. $10).
        </li>
        <li>
          Ga naar <Ext href="https://openrouter.ai/settings/keys">Keys</Ext> (niet Management Keys) en klik <strong>Create Key</strong>, naam bijv. <em>SEO Studio</em>.
        </li>
        <li>
          Zet een <strong>Credit limit</strong> (bijv. $10) met reset <strong>Monthly</strong>.
        </li>
        <li>
          Kopieer de sleutel (begint met <code className="mono">sk-or-v1-</code>) en plak hem hierboven. Je ziet hem maar één keer: bewaar hem in je wachtwoordbeheer.
        </li>
      </ol>
    </Blok>
  );
}

export function DataForSeoUitleg() {
  return (
    <Blok titel="Wat is DataForSEO, en heb ik het nodig?">
      <p>
        <strong>Wat het doet:</strong> DataForSEO levert echte cijfers uit Google: hoeveel mensen per maand op een zoekwoord zoeken, hoe moeilijk het is om daarop
        bovenaan te komen en wat adverteerders ervoor betalen. De studio gebruikt dit bij <strong>Kansen</strong> en bij <strong>Lokaal</strong> (je Google
        Bedrijfsprofiel, je positie in Google Maps, concurrenten en reviews).
      </p>
      <p>
        <strong>Voor Kansen optioneel, voor Lokaal nodig:</strong> Kansen werkt ook zonder (op Google-suggesties). Lokaal kan niet zonder DataForSEO: daar komt alle
        data over je bedrijfsprofiel vandaan.
      </p>
      <p>
        <strong>Waarom je het wilt:</strong> zonder cijfers weet je wél waar mensen op zoeken (Google-suggesties), maar niet hoe vaak. Met DataForSEO kiest de studio
        de onderwerpen die echt bezoekers opleveren, en vermijdt hij termen waar bijna niemand op zoekt of waar je nooit van grote sites wint. De score per kans wordt
        daardoor veel betrouwbaarder.
      </p>
      <p>
        <strong>Kosten en tegoed:</strong> een nieuw account krijgt meestal een klein proeftegoed (ongeveer $1), genoeg om het uit te proberen. Daarna moet je zelf
        tegoed opwaarderen (Billing → minimaal $50, het verloopt niet). Een Kansen-analyse kost ongeveer $0,10–$0,20, een Lokaal-analyse ongeveer $0,03 per
        vestiging, dus daar doe je heel lang mee. Is het tegoed op, dan meldt de studio dat. De cijfers zijn schattingen (net als bij elke SEO-tool) en voor
        kleine, lokale zoekwoorden soms 0 of onbekend, terwijl er toch af en toe op gezocht wordt.
      </p>
      <ol className="list-decimal space-y-1.5 pl-4">
        <li>
          Maak een account op <Ext href="https://app.dataforseo.com/register">dataforseo.com</Ext>. Waardeer op via <Ext href="https://app.dataforseo.com/billing">Billing</Ext> zodra het proeftegoed op is.
        </li>
        <li>
          Ga naar <Ext href="https://app.dataforseo.com/api-access">API Access</Ext>. Je API-login is meestal je e-mailadres.
        </li>
        <li>
          Klik <strong>Send by e-mail</strong>: je krijgt je <strong>API-wachtwoord</strong> per mail. Dat is een ander wachtwoord dan waarmee je inlogt.
        </li>
        <li>Vul login en API-wachtwoord in bij Instellingen (of in de startwizard bij Lokaal), sla op en klik Test DataForSEO. Het tegoed staat daarna bovenaan bij Lokaal.</li>
      </ol>
    </Blok>
  );
}

export function CmsUitleg({ cms }: { cms: Cms }) {
  if (cms === "wordpress")
    return (
      <Blok titel="Hoe koppel ik WordPress? (stap voor stap)">
        <p>Je maakt in WordPress een apart wachtwoord voor deze koppeling (een Application Password). Het gewone wachtwoord is niet nodig.</p>
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>
            Log in op je WordPress-beheer (<code className="mono">site.nl/wp-admin</code>).
          </li>
          <li>
            Ga naar <strong>Gebruikers → Profiel</strong>.
          </li>
          <li>
            Scroll naar <strong>Applicatie wachtwoorden</strong> (Application Passwords).
          </li>
          <li>
            Naam: <em>R7N SEO Studio</em> → klik <strong>Applicatie wachtwoord toevoegen</strong>.
          </li>
          <li>Kopieer het wachtwoord (vier blokjes met spaties, die mogen blijven). Je ziet het maar één keer.</li>
          <li>
            Vul hierboven in: de <strong>site-URL</strong>, de <strong>gebruikersnaam</strong> (staat bovenaan het profiel) en dit <strong>wachtwoord</strong>.
          </li>
        </ol>
        <p className="text-xs">Tip: gebruik liefst een aparte gebruiker met rol Redacteur in plaats van een beheerder.</p>
      </Blok>
    );
  if (cms === "shopify")
    return (
      <Blok titel="Hoe koppel ik Shopify? (stap voor stap)">
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>
            Shopify-beheer → <strong>Settings → Apps and sales channels → Develop apps → Create an app</strong> (naam: <em>R7N SEO Studio</em>).
          </li>
          <li>
            <strong>Configuration → Admin API integration → Configure</strong>: vink <code className="mono">write_content</code> en <code className="mono">read_content</code> aan, Save.
          </li>
          <li>
            <strong>API credentials → Install app</strong> en kopieer het <strong>Admin API access token</strong> (<code className="mono">shpat_…</code>).
          </li>
          <li>
            Vul hierboven het winkeldomein (<code className="mono">winkel.myshopify.com</code>) en het token in.
          </li>
        </ol>
        <p className="text-xs">Er moet al een blog bestaan (Online Store → Blog posts). Blog-ID leeg = eerste blog.</p>
      </Blok>
    );
  if (cms === "anders")
    return (
      <Blok titel="Welke manier kies ik bij een ander platform?">
        <p>
          <strong>Kopiëren en plakken</strong> werkt altijd: de studio maakt de blog klaar en jij plakt de tekst en de afbeelding in je eigen platform (Wix,
          Squarespace, Webflow, Lightspeed, Jimdo, …). Kies dit als je niet zeker weet wat je hebt.
        </p>
        <p>
          <strong>Eigen koppeling (API)</strong> is voor sites met een eigen adres dat blogs ontvangt, bijvoorbeeld een site gebouwd met Lovable of Claude Code, of
          Webflow via Make of Zapier. De studio stuurt de blog als JSON naar dat adres met je sleutel in de kop <code className="mono">x-api-key</code>.
        </p>
        <p className="text-xs">
          Velden die de studio stuurt: title, slug, excerpt, html, markdown, meta_description, category, tags, status, publish_at en image (base64, mime, filename,
          alt). Terug verwacht: id en url.
        </p>
      </Blok>
    );
  return null;
}
