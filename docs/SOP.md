# SOP — R7N SEO Studio

**Doel:** binnen een uur je eigen SEO-studio draaien en je eerste blog op je website hebben.
**Voor wie:** ondernemers en marketeers met een eigen website (WordPress, Shopify of een ander platform).
**Versie:** 1.1 · R7N Growth

---

## 0. Wat je klaarzet (10 minuten)

| | Waar | Let op |
|---|---|---|
| **Node.js (LTS)** | [nodejs.org](https://nodejs.org) → download LTS → installeren | Eenmalig |
| **OpenRouter-sleutel** | [openrouter.ai](https://openrouter.ai) → Credits: zet $10 tegoed → [Keys](https://openrouter.ai/settings/keys) → **Create Key** → Credit limit $10, **Monthly** | Kies **Keys**, niet *Management Keys*. Je ziet de sleutel één keer: bewaar hem. |
| **Toegang tot je website** | Zie stap 3 | — |
| **DataForSEO** (optioneel voor Kansen, **nodig voor Lokaal**) | [dataforseo.com](https://app.dataforseo.com/register) → tegoed opwaarderen via Billing (minimaal $50; nieuw account heeft een klein proeftegoed) → API Access → **Send by e-mail** | Het API-wachtwoord is níet je inlogwachtwoord |

**Waarom OpenRouter?** Eén account waarmee de studio de beste AI gebruikt: Claude schrijft, OpenAI maakt de afbeeldingen. Je betaalt alleen wat je gebruikt.

**Waarom DataForSEO?** Zonder weet de studio wel waar mensen op zoeken, maar niet hoe vaak. Met DataForSEO kiest hij onderwerpen die echt bezoekers opleveren en vermijdt hij termen waar niemand op zoekt of waar je nooit van grote sites wint. Voor Kansen optioneel, maar aangeraden zodra je er serieus mee aan de slag gaat. Voor Lokaal (je Google Bedrijfsprofiel) is het nodig: alle data over je profiel komt daarvandaan.

---

## 1. Installeren en openen (5 minuten)
1. Download de zip en pak hem uit, bijvoorbeeld in je map Documenten.
2. Dubbelklik op **Start R7N SEO Studio** (`.command` op Mac, `.bat` op Windows).
   - Mac zegt dat het bestand van internet komt? Rechtsklik → **Open** → **Open**.
3. De eerste keer installeert de studio zichzelf. Daarna opent je browser op **http://localhost:3000**.
4. Laat het zwarte venster open zolang je werkt. Klaar? Sluit het venster.

**Met Claude Code:** open de map in Claude Code en typ *"open de localhost"*.

---

## 2. Wizard stap 1 en 2: website en profiel (5 minuten)
1. Vul het adres van je website in en plak je OpenRouter-sleutel.
2. Kies het model: **Claude Opus 5.5** (beste) of **Sonnet 5.5** (sneller, goedkoper). Beeld: **OpenAI GPT-5.4 Image 2**.
3. Klik **Lees mijn website**. De studio maakt je bedrijfsprofiel en schrijfstijl.
4. **Controleer de schrijfstijl goed.** Spreek je klanten aan met *u* of *je*? Welke woorden gebruik je nooit? Zet vaste wensen bij *Vaste wensen*.

---

## 3. Wizard stap 3: koppel je website (10 minuten)

### WordPress
1. Log in op je WordPress → **Gebruikers → Profiel** → scroll naar **Applicatie wachtwoorden**.
2. Naam: *R7N SEO Studio* → **Applicatie wachtwoord toevoegen** → kopieer het wachtwoord.
3. Vul in de studio in: het adres, je **gebruikersnaam** (staat bovenaan je profiel, vaak je e-mailadres) en het wachtwoord.
4. Klik **Test verbinding**. Je ziet "Verbonden als …".

> Fout "inlog niet herkend"? Je hebt waarschijnlijk de naam van het wachtwoord ingevuld in plaats van je gebruikersnaam.

### Shopify
Sinds 1 januari 2026 geeft Shopify geen vaste sleutel (`shpat_…`) meer via *Apps ontwikkelen*. Je maakt de app nu in het **Dev Dashboard** en krijgt een **Klant-ID** en een **Klantgeheim**. De studio haalt daarmee zelf elke dag een nieuwe sleutel op.

**Wie kan dit?** De winkeleigenaar, of een personeelsaccount van de winkel met het recht *App-ontwikkeling*. Een samenwerkingsaccount (bijv. van een bureau) kan het niet: Shopify weigert dan de koppeling (`shop_not_permitted`). Doe je het voor een klant? Laat de klant je dan als personeel toevoegen, of laat de klant deze stappen zelf doen.

1. Shopify-beheer → **Instellingen → Apps → Apps ontwikkelen** → klik door naar het **Dev Dashboard** (of ga naar `dev.shopify.com/dashboard` met hetzelfde account).
2. **Create app → Start from Dev Dashboard** → naam *R7N SEO Studio* → **Create**.
3. **Versions**: laat **App URL** op de standaard staan (níet het adres van de studio). Kies bij **Scopes** `read_content` en `write_content` → **Release**.
4. **Install app** (kaart *Installs*) → kies je winkel → **Install**. Kom je daarna op een Shopify-pagina uit, dan is dat goed.
5. Open **Settings** van de app en kopieer de **Client ID** en het **Client secret** (`shpss_…`).
6. Vul in de studio je `…myshopify.com`-adres, de **Klant-ID** en het **Klantgeheim** in → **Test verbinding**.

> Heb je nog een oude app van vóór 2026 met een `shpat_`-sleutel? Die kun je in de studio nog invullen onder *Heb je nog een oude vaste sleutel?*.
>
> Foutmeldingen: *"Shopify kent deze Klant-ID niet"* = Client ID verkeerd gekopieerd. *"De app is nog niet geïnstalleerd"* = stap 4 overgeslagen. *"Niet toegestaan… andere organisatie"* = gemaakt met een samenwerkingsaccount, zie hierboven.

### Ander platform
- **Kopiëren en plakken** (werkt altijd): je kopieert straks per blog de tekst of HTML en de afbeelding naar je eigen platform.
- **Eigen koppeling (API)**: voor sites met een eigen blog-adres. Vul het adres en de sleutel in.

---

## 4. Opmaak op je site (WordPress, 5 minuten, aangeraden)
1. WordPress → **Plugins → Nieuwe plugin → Plugin uploaden** → kies `wordpress-plugin/r7n-blog.zip` → **Activeren**.
2. **Instellingen → R7N Blog**: kies je accentkleur en donkere kleur, vul bij elk actieblok de **link** in (contact, afspraak, advies, service) en schrijf een korte tekst bij *Over ons*.
3. In de studio: **Instellingen → Opmaak op je site** → vink de plugin aan en kies welke actieblokken je wilt.

Vanaf nu krijgt elke blog een kop met afbeelding, inhoudsopgave, actieblok, tip en uitklapbare vragen.

---

## 5. Je eerste blog (15 minuten)
1. **Kansen → Start de analyse** (2 à 3 minuten).
2. Kies een kans met een hoge score en het label *nog niet op je site*. Open hem en lees de brief.
3. Klik **Schrijf deze blog** (2 à 3 minuten).
4. Lees de blog in het **Voorbeeld**. Pas aan via **Bewerken** waar nodig.
5. Kijk naar de **Kwaliteitscheck**: rode punten eerst oplossen.
6. **Zet nu live** of **Inplannen**. Bij inplannen zet je website de blog zelf live; je computer hoeft niet aan te staan.

---

## 6. Ritme (10 minuten per week)
- **Maandag:** 2 blogs laten schrijven, nalezen en inplannen voor dinsdag en donderdag, 's ochtends.
- **Eens per maand:** nieuwe analyse bij Kansen.
- **Na 6 tot 8 weken:** kijk in Google Search Console welke blogs bezoekers trekken, en schrijf meer over die thema's.

---

## 6b. Lokaal: je Google Bedrijfsprofielen (15 minuten, eens per maand)
Voor winkels en bedrijven met een vestiging. Vraagt een DataForSEO-account **met tegoed** (zie stap 0): een nieuw account heeft een klein proeftegoed, daarna waardeer je op via Billing (minimaal $50). Je kunt je bedrijfsprofiel ook al toevoegen in de startwizard (stap Lokaal).
1. Ga naar **Lokaal → Profielen**. Typ de naam en plaats van je bedrijf, zoals je het in Google Maps zou zoeken, en klik op **Zoek in Google**.
2. Kies het juiste profiel. Vul je **vestigingspagina** in (de pagina op je site met adres en openingstijden) en 2 à 3 **zoekwoorden** zonder plaatsnaam, bijvoorbeeld "bakker, banketbakker". Herhaal dit voor elke vestiging.
3. Ga naar **Lokaal → Analyse** en klik op **Eerste meting**. Dit duurt 2 tot 4 minuten en kost ongeveer $0,03 per vestiging.
4. Bovenaan zie je per vestiging de score, sterren, reviews, foto's en de gemiddelde positie in Google Maps. Klik op een vestiging om naar de kaart te springen.
5. Per vestiging staat onder **Kansen en wat je doet** een genummerde lijst, de grootste winst bovenaan. Bij elke kans: waarom hij telt, de stappen (waar je klikt in je profiel) en, waar het kan, de tekst om te plakken met een knop **Kopieer**. Log in op Google met het account dat beheerder is van je profiel, voer de stappen uit en klik op **Gedaan**. Automatisch doorvoeren kan niet: daarvoor is een eigen Google Cloud-project met goedgekeurde Business Profile API nodig.
6. Onder **Meer kansen** staat wat opviel in de vergelijking met de concurrenten en wat Claude in je profiel en reviews zag. Daaronder de checklist, je positie in Google Maps vanaf vier kanten en de concurrenten die boven je staan.
7. Plaats elke week één Google-bericht per vestiging: de studio zet er een klaar onder **Google-bericht**. Kopieer, plaats het via je profiel (Update toevoegen) en klik op **Geplaatst**.
8. Meet eens per maand opnieuw en kijk of je score en positie stijgen.

## 7. Problemen oplossen
| Melding | Oplossing |
|---|---|
| *OpenRouter kent deze sleutel niet* | Nieuwe sleutel maken onder **Keys** (geen Management Key) |
| *Tegoed is op* | Tegoed bijstorten of de limiet van je sleutel verhogen |
| *WordPress herkent deze inlog niet* | Gebruikersnaam van het account invullen, niet de naam van het wachtwoord |
| *Gebruiker mag niet publiceren of uploaden* | Geef de WordPress-gebruiker de rol Auteur, Editor of Beheerder |
| *Adres bestaat al* | Pas bij Zoekmachines het adres (slug) aan |
| Blog ziet er kaal uit | Installeer de R7N Blog-plugin (stap 4) |

---

## Volgende stap: je eigen Mission Control
Werk je voor meerdere websites of klanten, of wil je je leads, website-cijfers en content op één plek zien? Dan is een eigen **Mission Control** de volgende stap. Vraag R7N Growth naar de mogelijkheden.
