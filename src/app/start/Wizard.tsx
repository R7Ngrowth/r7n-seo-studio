"use client";

import { Check, CheckCircle2, Globe, Loader2, MapPin, Plug, Plus, Rocket, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CmsUitleg, DataForSeoUitleg, OpenRouterUitleg } from "@/components/Uitleg";
import { MODELLEN, type Cms, type Koppeling, type Profiel } from "@/lib/types";
import type { Zoekresultaat } from "@/lib/lokaal";
import { voegToe, zoek } from "../lokaal/acties";
import { analyseer, bewaarDfs, rondAf, testKoppeling } from "./actions";

const STAPPEN = ["Website", "Profiel", "Koppeling", "Lokaal", "Klaar"];

export function Wizard({ begin }: { begin: { website: string; sleutelAanwezig: boolean; dfsAanwezig?: boolean; stap?: number } }) {
  const router = useRouter();
  const [stap, setStap] = useState(begin.stap ?? 0);
  const [bezig, setBezig] = useState<"analyse" | "test" | "opslaan" | "dfs" | "zoek" | "toevoegen" | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const [adres, setAdres] = useState(begin.website);
  const [sleutel, setSleutel] = useState("");
  const [tekstmodel, setTekstmodel] = useState<string>(MODELLEN.tekst[0].id);
  const [beeldmodel, setBeeldmodel] = useState<string>(MODELLEN.beeld[0].id);

  const [profiel, setProfiel] = useState<Profiel>({ website: "", naam: "", onderwerp: "", doelgroep: "", toon: "", taal: "Nederlands", auteur: "", extra: "", aanbod: "" });
  const zet = (k: keyof Profiel, v: string) => setProfiel((p) => ({ ...p, [k]: v }));
  const [blogs, setBlogs] = useState(0);
  const [paginas, setPaginas] = useState(0);

  const [k, setK] = useState<Koppeling>({ cms: "geen" });
  const zetK = (veld: keyof Koppeling, v: string) => setK((x) => ({ ...x, [veld]: v }));
  const [herkend, setHerkend] = useState<Cms>("geen");
  const [test, setTest] = useState<{ ok: boolean; tekst: string } | null>(null);

  // Stap Lokaal (optioneel): DataForSEO + je Google Bedrijfsprofiel(en).
  const [dfsLogin, setDfsLogin] = useState("");
  const [dfsWw, setDfsWw] = useState("");
  const [dfsOk, setDfsOk] = useState(begin.dfsAanwezig ?? false);
  const [vraag, setVraag] = useState("");
  const [gevonden, setGevonden] = useState<Zoekresultaat[] | null>(null);
  const [gekozen, setGekozen] = useState<Zoekresultaat | null>(null);
  const [vestigingspagina, setVestigingspagina] = useState("");
  const [woorden, setWoorden] = useState("");
  const [toegevoegd, setToegevoegd] = useState<string[]>([]);

  async function doeAnalyse() {
    setBezig("analyse");
    setFout(null);
    const r = await analyseer(adres, sleutel, tekstmodel, beeldmodel);
    setBezig(null);
    if (!r.ok) return setFout(r.fout);
    setProfiel(r.data.profiel);
    setBlogs(r.data.blogs.length);
    setPaginas(r.data.paginas);
    setHerkend(r.data.cms);
    if (r.data.cms === "wordpress") setK({ cms: "wordpress", wpUrl: r.data.profiel.website });
    if (r.data.cms === "shopify") setK({ cms: "shopify" });
    setStap(1);
  }

  const moetTesten = k.cms === "wordpress" || k.cms === "shopify" || (k.cms === "anders" && k.andersManier === "api");

  async function doeTest() {
    setBezig("test");
    setTest(null);
    const r = await testKoppeling(k);
    setBezig(null);
    setTest(r.ok ? { ok: true, tekst: r.data } : { ok: false, tekst: r.fout });
  }

  async function doeDfs() {
    setBezig("dfs");
    setFout(null);
    const r = await bewaarDfs(dfsLogin, dfsWw);
    setBezig(null);
    if (!r.ok) return setFout(r.fout);
    setDfsOk(true);
    setDfsWw("");
    if (!vraag) setVraag(profiel.naam);
  }

  async function doeZoek() {
    setBezig("zoek");
    setFout(null);
    setGekozen(null);
    const r = await zoek(vraag || profiel.naam);
    setBezig(null);
    if (r.ok) setGevonden(r.data);
    else setFout(r.fout);
  }

  function kies(r: Zoekresultaat) {
    setGekozen(r);
    setVestigingspagina(profiel.website);
    setWoorden([...new Set([r.categorie, ...r.extra].map((c) => c.toLowerCase()).filter(Boolean))].slice(0, 3).join(", "));
  }

  async function doeToevoegen() {
    if (!gekozen) return;
    setBezig("toevoegen");
    setFout(null);
    const r = await voegToe(gekozen, vestigingspagina, woorden.split(",").map((w) => w.trim()).filter(Boolean));
    setBezig(null);
    if (!r.ok) return setFout(r.fout);
    setToegevoegd((l) => [...l, gekozen.naam]);
    setGekozen(null);
    setGevonden(null);
  }

  async function afronden() {
    setBezig("opslaan");
    setFout(null);
    const r = await rondAf(profiel, k, { plugin: false, ctas: ["advies", "afspraak", "contact"] });
    if (!r.ok) {
      setBezig(null);
      return setFout(r.fout);
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <ol className="mb-5 flex items-center gap-2">
        {STAPPEN.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < stap ? "bg-ok text-bg" : i === stap ? "bg-accent text-accent-ink" : "border border-line text-muted"
              }`}
            >
              {i < stap ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`lbl hidden !text-[10px] sm:inline ${i === stap ? "!text-text" : ""}`}>{s}</span>
            {i < STAPPEN.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {fout && <div className="melding melding-rood mb-4 px-4 py-3 text-sm text-bad">{fout}</div>}

      {stap === 0 && (
        <Kaart icoon={<Globe className="h-4 w-4" />} titel="Je website" uitleg="De studio leest je website: waar je bedrijf over gaat, je schrijfstijl en de blogs die er al staan.">
          <div className="space-y-4">
            <Veld label="Adres van je website">
              <input value={adres} onChange={(e) => setAdres(e.target.value)} placeholder="https://www.jouwbedrijf.nl" className="veld" autoFocus />
            </Veld>
            <Veld label="OpenRouter-sleutel" noot={begin.sleutelAanwezig ? "Er staat al een sleutel; vul hem opnieuw in om verder te gaan." : "Via OpenRouter schrijft Claude je blogs en maakt OpenAI de afbeeldingen. Je betaalt alleen wat je gebruikt (±$0,10–0,40 per blog). Uitleg hieronder."}>
              <input value={sleutel} onChange={(e) => setSleutel(e.target.value)} type="password" autoComplete="off" placeholder="sk-or-v1-…" className="veld mono !text-xs" />
            </Veld>
          </div>
          <OpenRouterUitleg />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Veld label="Blogs schrijven met">
              <select value={tekstmodel} onChange={(e) => setTekstmodel(e.target.value)} className="veld">
                {MODELLEN.tekst.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.naam} · {m.noot}
                  </option>
                ))}
              </select>
            </Veld>
            <Veld label="Afbeeldingen maken met">
              <select value={beeldmodel} onChange={(e) => setBeeldmodel(e.target.value)} className="veld">
                {MODELLEN.beeld.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.naam} · {m.noot}
                  </option>
                ))}
              </select>
            </Veld>
          </div>
          <button onClick={doeAnalyse} disabled={bezig !== null || !adres.trim() || !sleutel.trim()} className="btn btn-vol mt-6 w-full">
            {bezig === "analyse" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {bezig === "analyse" ? "Website lezen… (±30–60 sec)" : "Lees mijn website"}
          </button>
        </Kaart>
      )}

      {stap === 1 && (
        <Kaart icoon={<Sparkles className="h-4 w-4" />} titel="Je bedrijfsprofiel" uitleg={`Gemaakt uit ${paginas} pagina's van je site. Pas aan wat niet klopt: hiermee schrijft de studio voortaan in jouw stem.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Veld label="Bedrijfsnaam">
              <input value={profiel.naam} onChange={(e) => zet("naam", e.target.value)} className="veld" />
            </Veld>
            <Veld label="Ondertekening blogs">
              <input value={profiel.auteur} onChange={(e) => zet("auteur", e.target.value)} placeholder="Bijv. Team Jouwbedrijf" className="veld" />
            </Veld>
            <Veld label="Wat doet je bedrijf" breed>
              <textarea value={profiel.onderwerp} onChange={(e) => zet("onderwerp", e.target.value)} rows={2} className="veld" />
            </Veld>
            <Veld label="Doelgroep">
              <input value={profiel.doelgroep} onChange={(e) => zet("doelgroep", e.target.value)} className="veld" />
            </Veld>
            <Veld label="Taal">
              <input value={profiel.taal} onChange={(e) => zet("taal", e.target.value)} className="veld" />
            </Veld>
            <Veld label="Wat je verkoopt of doet" noot="Productgroepen en diensten, met komma. Kansen onderzoekt elke groep apart; zet er ook bij wat (nog) niet op je site staat, bijvoorbeeld fatbikes." breed>
              <textarea value={profiel.aanbod ?? ""} onChange={(e) => zet("aanbod", e.target.value)} rows={2} placeholder="bakfiets, e-bike, fatbike, kinderfiets, werkplaats" className="veld" />
            </Veld>
            <Veld label="Schrijfstijl (tone of voice)" breed>
              <textarea value={profiel.toon} onChange={(e) => zet("toon", e.target.value)} rows={6} className="veld" />
            </Veld>
            <Veld label="Vaste wensen (optioneel)" noot="Bijv. merken die je wel of niet noemt, woorden die je vermijdt, een vaste afsluiter." breed>
              <textarea value={profiel.extra} onChange={(e) => zet("extra", e.target.value)} rows={3} className="veld" />
            </Veld>
          </div>
          {blogs > 0 && (
            <div className="melding melding-normaal mt-4 flex items-center gap-2 px-4 py-3 text-xs text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-ok" /> {blogs} bestaande blog{blogs === 1 ? "" : "s"} gevonden; de studio linkt ernaar en voorkomt dubbele onderwerpen.
            </div>
          )}
          <Navigatie terug={() => setStap(0)} verder={() => setStap(2)} />
        </Kaart>
      )}

      {stap === 2 && (
        <Kaart icoon={<Plug className="h-4 w-4" />} titel="Koppel je website" uitleg="Waar moeten de blogs komen? Je kunt dit ook later doen; schrijven werkt al zonder koppeling.">
          {herkend !== "geen" && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" /> Herkend: {herkend === "wordpress" ? "WordPress" : herkend === "shopify" ? "Shopify" : "ander platform"}.
            </p>
          )}
          <div className="grid gap-2.5 sm:grid-cols-4">
            {(
              [
                ["wordpress", "WordPress", "Application Password"],
                ["shopify", "Shopify", "Klant-ID + Klantgeheim"],
                ["anders", "Ander platform", "Eigen koppeling of plakken"],
                ["geen", "Later", "Eerst alleen schrijven"],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setK(
                    id === "wordpress"
                      ? { cms: "wordpress", wpUrl: profiel.website }
                      : id === "anders"
                        ? { cms: "anders", andersManier: "handmatig" }
                        : { cms: id }
                  );
                  setTest(null);
                }}
                className={`rounded-xl border p-3 text-left transition-colors ${k.cms === id ? "border-accent bg-accent/10" : "border-line hover:border-accent/40"}`}
              >
                <div className="text-sm font-semibold">{label}</div>
                <div className="mt-0.5 text-[11px] text-muted">{hint}</div>
              </button>
            ))}
          </div>
          {k.cms === "wordpress" && (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Veld label="Adres van je WordPress-site" breed>
                  <input value={k.wpUrl ?? ""} onChange={(e) => zetK("wpUrl", e.target.value)} className="veld" />
                </Veld>
                <Veld label="Gebruikersnaam" noot="Van het account waar je het wachtwoord maakt (vaak je e-mailadres).">
                  <input value={k.wpGebruiker ?? ""} onChange={(e) => zetK("wpGebruiker", e.target.value)} autoComplete="off" className="veld" />
                </Veld>
                <Veld label="Application Password">
                  <input value={k.wpWachtwoord ?? ""} onChange={(e) => zetK("wpWachtwoord", e.target.value)} type="password" autoComplete="off" placeholder="xxxx xxxx xxxx xxxx" className="veld mono !text-xs" />
                </Veld>
              </div>
              <CmsUitleg cms="wordpress" />
              <button type="button" onClick={doeTest} disabled={bezig !== null} className="btn mt-4">
                {bezig === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test verbinding
              </button>
              {test && <div className={`melding mt-3 px-4 py-3 text-sm ${test.ok ? "border-ok/30 bg-ok/10 text-ok" : "melding-rood text-bad"}`}>{test.tekst}</div>}
            </>
          )}
          {k.cms === "shopify" && (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Veld label="Winkeladres" noot="Eindigt op .myshopify.com (Instellingen → Domeinen).">
                  <input value={k.shopWinkel ?? ""} onChange={(e) => zetK("shopWinkel", e.target.value)} placeholder="jouwwinkel.myshopify.com" className="veld" />
                </Veld>
                <Veld label="Blog (optioneel)" noot="Leeg = je eerste blog. Anders de naam in de adresbalk (bijv. nieuws).">
                  <input value={k.shopBlogId ?? ""} onChange={(e) => zetK("shopBlogId", e.target.value)} className="veld" />
                </Veld>
                <Veld label="Klant-ID (Client ID)" noot="Dev Dashboard → je app → Settings.">
                  <input value={k.shopClientId ?? ""} onChange={(e) => zetK("shopClientId", e.target.value)} autoComplete="off" placeholder="32 tekens" className="veld mono !text-xs" />
                </Veld>
                <Veld label="Klantgeheim (Client secret)" noot="Begint met shpss_. De studio haalt hiermee zelf elke dag een nieuwe sleutel op.">
                  <input value={k.shopClientSecret ?? ""} onChange={(e) => zetK("shopClientSecret", e.target.value)} type="password" autoComplete="off" placeholder="shpss_…" className="veld mono !text-xs" />
                </Veld>
                <details className="sm:col-span-2 text-xs text-muted">
                  <summary className="cursor-pointer">Heb je nog een oude vaste sleutel (shpat_, van vóór 2026)?</summary>
                  <div className="mt-3">
                    <Veld label="Oude sleutel (Admin API access token)" noot="Alleen als je geen Klant-ID en Klantgeheim hebt. Die gaan altijd voor.">
                      <input value={k.shopToken ?? ""} onChange={(e) => zetK("shopToken", e.target.value)} type="password" autoComplete="off" placeholder="shpat_…" className="veld mono !text-xs" />
                    </Veld>
                  </div>
                </details>
              </div>
              <CmsUitleg cms="shopify" />
              <button type="button" onClick={doeTest} disabled={bezig !== null} className="btn mt-4">
                {bezig === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test verbinding
              </button>
              {test && <div className={`melding mt-3 px-4 py-3 text-sm ${test.ok ? "border-ok/30 bg-ok/10 text-ok" : "melding-rood text-bad"}`}>{test.tekst}</div>}
            </>
          )}
          {k.cms === "anders" && (
            <>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {(
                  [
                    ["handmatig", "Kopiëren en plakken", "Werkt met elk platform"],
                    ["api", "Eigen koppeling (API)", "Voor sites met een blog-adres"],
                  ] as const
                ).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setK({ cms: "anders", andersManier: id, apiUrl: k.apiUrl, apiSleutel: k.apiSleutel });
                      setTest(null);
                    }}
                    className={`rounded-xl border p-3 text-left transition-colors ${k.andersManier === id ? "border-accent bg-accent/10" : "border-line hover:border-accent/40"}`}
                  >
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{hint}</div>
                  </button>
                ))}
              </div>
              {k.andersManier === "api" && (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Veld label="Adres van je blog-koppeling" breed>
                      <input value={k.apiUrl ?? ""} onChange={(e) => zetK("apiUrl", e.target.value)} placeholder="https://…/blog-publish" className="veld mono !text-xs" />
                    </Veld>
                    <Veld label="API-sleutel (x-api-key)" breed>
                      <input value={k.apiSleutel ?? ""} onChange={(e) => zetK("apiSleutel", e.target.value)} type="password" autoComplete="off" className="veld mono !text-xs" />
                    </Veld>
                  </div>
                  <button type="button" onClick={doeTest} disabled={bezig !== null} className="btn mt-4">
                    {bezig === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test verbinding
                  </button>
                  {test && <div className={`melding mt-3 px-4 py-3 text-sm ${test.ok ? "border-ok/30 bg-ok/10 text-ok" : "melding-rood text-bad"}`}>{test.tekst}</div>}
                </>
              )}
              <CmsUitleg cms="anders" />
            </>
          )}
          <Navigatie
            terug={() => setStap(1)}
            verder={() => setStap(3)}
            kanVerder={moetTesten ? !!test?.ok : true}
            noot={moetTesten && !test?.ok ? "Test eerst de verbinding." : undefined}
          />
        </Kaart>
      )}

      {stap === 3 && (
        <Kaart
          icoon={<MapPin className="h-4 w-4" />}
          titel="Lokaal: je Google Bedrijfsprofiel (optioneel)"
          uitleg="Heb je een winkel of vestiging? Dan analyseert de studio ook je Google Bedrijfsprofiel: je positie in Google Maps, concurrenten, reviews en wat je kunt verbeteren. Hiervoor heb je een DataForSEO-account nodig. Je kunt dit ook overslaan en later doen bij Lokaal."
        >
          {!dfsOk ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Veld label="DataForSEO API-login" noot="Meestal je e-mailadres. Te vinden op app.dataforseo.com → API Access.">
                  <input value={dfsLogin} onChange={(e) => setDfsLogin(e.target.value)} className="veld" autoComplete="off" />
                </Veld>
                <Veld label="DataForSEO API-wachtwoord" noot="Niet je inlogwachtwoord: kies op API Access voor 'Send by e-mail'.">
                  <input type="password" value={dfsWw} onChange={(e) => setDfsWw(e.target.value)} className="veld" autoComplete="off" />
                </Veld>
              </div>
              <button type="button" onClick={doeDfs} disabled={bezig !== null} className="btn mt-4">
                {bezig === "dfs" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Controleer DataForSEO
              </button>
              <DataForSeoUitleg />
            </>
          ) : (
            <>
              <p className="mb-3 flex items-center gap-1.5 text-xs text-ok">
                <CheckCircle2 className="h-3.5 w-3.5" /> DataForSEO is gekoppeld.
              </p>
              {toegevoegd.length > 0 && (
                <div className="melding melding-normaal mb-4 px-4 py-3 text-xs text-muted">
                  Toegevoegd: {toegevoegd.join(", ")}. Heb je meer vestigingen? Zoek de volgende op.
                </div>
              )}
              {!gekozen && (
                <div className="flex flex-wrap gap-2.5">
                  <input value={vraag} onChange={(e) => setVraag(e.target.value)} placeholder="Bedrijfsnaam en plaats" className="veld min-w-0 flex-1" />
                  <button type="button" onClick={doeZoek} disabled={bezig !== null} className="btn">
                    {bezig === "zoek" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Zoek in Google
                  </button>
                </div>
              )}
              {gevonden && !gekozen && (
                <div className="mt-3 space-y-2">
                  {gevonden.length === 0 && <p className="text-sm text-muted">Niets gevonden. Probeer de naam met de plaats erbij.</p>}
                  {gevonden.map((r) => (
                    <div key={r.cid} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{r.naam}</div>
                        <div className="text-xs text-muted">{r.adres}</div>
                      </div>
                      <button type="button" onClick={() => kies(r)} className="btn !py-1.5 text-xs">
                        <Plus className="h-3.5 w-3.5" /> Dit is mijn bedrijf
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {gekozen && (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <div className="mb-3 text-sm font-medium">{gekozen.naam}</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Veld label="Pagina met adres en openingstijden" noot="Bijv. je contactpagina of vestigingspagina.">
                      <input value={vestigingspagina} onChange={(e) => setVestigingspagina(e.target.value)} className="veld" />
                    </Veld>
                    <Veld label="Zoekwoorden (met komma)" noot="Zonder plaatsnaam, bijv. 'bakker, banketbakker'.">
                      <input value={woorden} onChange={(e) => setWoorden(e.target.value)} className="veld" />
                    </Veld>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setGekozen(null)} className="btn-stil !text-muted hover:!text-text">
                      Annuleren
                    </button>
                    <button type="button" onClick={doeToevoegen} disabled={bezig !== null} className="btn btn-vol">
                      {bezig === "toevoegen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Toevoegen
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <Navigatie terug={() => setStap(2)} verder={() => setStap(4)} verderTekst={toegevoegd.length ? "Volgende" : "Overslaan"} />
        </Kaart>
      )}

      {stap === 4 && (
        <Kaart icoon={<Rocket className="h-4 w-4" />} titel="Klaar om te beginnen" uitleg="Controleer en sla op. Alles wat je invulde staat alleen op deze computer.">
          <dl className="space-y-2 rounded-xl border border-line/70 bg-surface/60 p-4 text-sm">
            <Rij label="Bedrijf" waarde={profiel.naam || "—"} />
            <Rij label="Website" waarde={profiel.website.replace(/^https?:\/\//, "")} />
            <Rij
              label="Koppeling"
              waarde={
                k.cms === "wordpress"
                  ? "WordPress (getest)"
                  : k.cms === "shopify"
                    ? "Shopify (getest)"
                    : k.cms === "anders"
                      ? k.andersManier === "api"
                        ? "Eigen koppeling (getest)"
                        : "Kopiëren en plakken"
                      : "Later"
              }
            />
            <Rij label="Lokaal" waarde={toegevoegd.length ? `${toegevoegd.length} bedrijfsprofiel${toegevoegd.length === 1 ? "" : "en"}` : "Later"} />
            <Rij label="Schrijver · beeld" waarde={`${MODELLEN.tekst.find((m) => m.id === tekstmodel)?.naam} · ${MODELLEN.beeld.find((m) => m.id === beeldmodel)?.naam}`} />
          </dl>
          <p className="mt-4 text-sm text-muted">
            Volgende stap: ga naar <strong className="text-text">Kansen</strong> en laat de studio uitzoeken waar jouw klanten op zoeken
            {toegevoegd.length ? <>, en naar <strong className="text-text">Lokaal</strong> voor je bedrijfsprofiel</> : null}.
          </p>
          <div className="mt-6 flex justify-between">
            <button type="button" onClick={() => setStap(3)} className="btn-stil !text-muted hover:!text-text">
              Terug
            </button>
            <button type="button" onClick={afronden} disabled={bezig !== null} className="btn btn-vol">
              {bezig === "opslaan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Start de studio
            </button>
          </div>
        </Kaart>
      )}
    </div>
  );
}

function Kaart({ icoon, titel, uitleg, children }: { icoon: ReactNode; titel: string; uitleg: string; children: ReactNode }) {
  return (
    <section className="kaart p-6">
      <h2 className="kop flex items-center gap-2">
        <span className="text-accent">{icoon}</span>
        {titel}
      </h2>
      <p className="mt-1 mb-5 text-sm text-muted">{uitleg}</p>
      {children}
    </section>
  );
}

function Veld({ label, noot, breed = false, children }: { label: string; noot?: string; breed?: boolean; children: ReactNode }) {
  return (
    <label className={`lbl block !text-[9.5px] ${breed ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {noot && <span className="mt-1 block text-[11px] normal-case tracking-normal text-muted">{noot}</span>}
    </label>
  );
}

function Navigatie({ terug, verder, kanVerder = true, noot, verderTekst = "Volgende" }: { terug: () => void; verder: () => void; kanVerder?: boolean; noot?: string; verderTekst?: string }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button type="button" onClick={terug} className="btn-stil !text-muted hover:!text-text">
        Terug
      </button>
      <span className="flex items-center gap-3">
        {noot && <span className="text-xs text-muted">{noot}</span>}
        <button type="button" onClick={verder} disabled={!kanVerder} className="btn btn-vol">
          {verderTekst}
        </button>
      </span>
    </div>
  );
}

function Rij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-medium">{waarde}</dd>
    </div>
  );
}
