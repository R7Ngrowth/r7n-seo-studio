"use client";

import { Bot, Building2, Database, LayoutTemplate, Loader2, Plug, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CmsUitleg, DataForSeoUitleg, OpenRouterUitleg } from "@/components/Uitleg";
import { CTA_SOORTEN, MODELLEN, type AiInstellingen, type CtaSoort, type DataForSeo, type Koppeling, type Opmaak, type Profiel } from "@/lib/types";
import { bewaarAlles, testDfs, testOpgeslagen } from "../acties";

type Begin = { profiel: Profiel; ai: AiInstellingen; dfs: DataForSeo; koppeling: Koppeling; opmaak: Opmaak };
type Heeft = { ai: boolean; dfs: boolean; wp: boolean; shop: boolean; api: boolean };
const opgeslagen = (ja: boolean, anders = "") => (ja ? "•••• opgeslagen — leeg laten = zo houden" : anders);

export function Formulier({ begin, heeft }: { begin: Begin; heeft: Heeft }) {
  const router = useRouter();
  const [p, setP] = useState(begin.profiel);
  const [ai, setAi] = useState(begin.ai);
  const [sleutel, setSleutel] = useState("");
  const [dfsLogin, setDfsLogin] = useState(begin.dfs.login);
  const [dfsWw, setDfsWw] = useState("");
  const [k, setK] = useState(begin.koppeling);
  const [o, setO] = useState(begin.opmaak);
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const zetP = (f: keyof Profiel, v: string) => setP((x) => ({ ...x, [f]: v }));
  const zetK = (f: keyof Koppeling, v: string) => setK((x) => ({ ...x, [f]: v }));

  async function opslaan() {
    setBezig("opslaan");
    setMelding(null);
    const r = await bewaarAlles({ profiel: p, ai, dfs: { login: dfsLogin, wachtwoord: "" }, koppeling: k, opmaak: o, nieuweSleutel: sleutel, nieuwDfsWachtwoord: dfsWw });
    setBezig(null);
    setMelding(r.ok ? { ok: true, tekst: "Opgeslagen." } : { ok: false, tekst: r.fout });
    if (r.ok) {
      setSleutel("");
      setDfsWw("");
      router.refresh();
    }
  }
  async function test(soort: "site" | "dfs") {
    setBezig(soort);
    setMelding(null);
    const r = soort === "site" ? await testOpgeslagen() : await testDfs();
    setBezig(null);
    setMelding(r.ok ? { ok: true, tekst: r.data } : { ok: false, tekst: r.fout });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {melding && <div className={`melding sticky top-2 z-10 px-4 py-3 text-sm ${melding.ok ? "border-ok/30 bg-ok/10 text-ok" : "melding-rood text-bad"}`}>{melding.tekst}</div>}

      <Blok icoon={<Building2 className="h-4 w-4" />} titel="Bedrijf en schrijfstijl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="Bedrijfsnaam">
            <input value={p.naam} onChange={(e) => zetP("naam", e.target.value)} className="veld" />
          </Veld>
          <Veld label="Website">
            <input value={p.website} onChange={(e) => zetP("website", e.target.value)} className="veld" />
          </Veld>
          <Veld label="Wat doet je bedrijf" breed>
            <textarea value={p.onderwerp} onChange={(e) => zetP("onderwerp", e.target.value)} rows={2} className="veld" />
          </Veld>
          <Veld label="Doelgroep">
            <input value={p.doelgroep} onChange={(e) => zetP("doelgroep", e.target.value)} className="veld" />
          </Veld>
          <Veld label="Taal">
            <input value={p.taal} onChange={(e) => zetP("taal", e.target.value)} className="veld" />
          </Veld>
          <Veld label="Schrijfstijl" breed>
            <textarea value={p.toon} onChange={(e) => zetP("toon", e.target.value)} rows={6} className="veld" />
          </Veld>
          <Veld label="Vaste wensen" breed>
            <textarea value={p.extra} onChange={(e) => zetP("extra", e.target.value)} rows={3} className="veld" />
          </Veld>
        </div>
      </Blok>

      <Blok icoon={<Bot className="h-4 w-4" />} titel="AI (OpenRouter)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="OpenRouter-sleutel" breed>
            <input value={sleutel} onChange={(e) => setSleutel(e.target.value)} type="password" autoComplete="off" placeholder={opgeslagen(heeft.ai, "sk-or-v1-…")} className="veld mono !text-xs" />
          </Veld>
          <Veld label="Blogs schrijven met">
            <select value={ai.tekstmodel} onChange={(e) => setAi({ ...ai, tekstmodel: e.target.value })} className="veld">
              {MODELLEN.tekst.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.naam} · {m.noot}
                </option>
              ))}
            </select>
          </Veld>
          <Veld label="Afbeeldingen maken met">
            <select value={ai.beeldmodel} onChange={(e) => setAi({ ...ai, beeldmodel: e.target.value })} className="veld">
              {MODELLEN.beeld.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.naam} · {m.noot}
                </option>
              ))}
            </select>
          </Veld>
          <Veld label="Beeldstijl (optioneel)" breed>
            <input value={ai.beeldstijl} onChange={(e) => setAi({ ...ai, beeldstijl: e.target.value })} placeholder="Bijv. natuurlijk licht, Nederlandse straten, mensen in beeld, geen tekst" className="veld" />
          </Veld>
        </div>
        <OpenRouterUitleg />
      </Blok>

      <Blok icoon={<Database className="h-4 w-4" />} titel="DataForSEO (optioneel, aangeraden)" uitleg="Echte zoekvolumes en moeilijkheid bij Kansen, zodat je schrijft over wat echt bezoekers oplevert.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="API-login">
            <input value={dfsLogin} onChange={(e) => setDfsLogin(e.target.value)} placeholder="meestal je e-mailadres" className="veld" />
          </Veld>
          <Veld label="API-wachtwoord">
            <input value={dfsWw} onChange={(e) => setDfsWw(e.target.value)} type="password" autoComplete="off" placeholder={opgeslagen(heeft.dfs, "niet je inlogwachtwoord")} className="veld mono !text-xs" />
          </Veld>
        </div>
        <DataForSeoUitleg />
        <button onClick={() => test("dfs")} disabled={bezig !== null || !heeft.dfs} className="btn mt-3">
          {bezig === "dfs" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} Test DataForSEO (na opslaan)
        </button>
      </Blok>

      <Blok icoon={<Plug className="h-4 w-4" />} titel="Koppeling met je website">
        <div className="grid gap-2.5 sm:grid-cols-4">
          {(
            [
              ["wordpress", "WordPress"],
              ["shopify", "Shopify"],
              ["anders", "Ander platform"],
              ["geen", "Geen"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setK((x) => ({ ...x, cms: id, andersManier: id === "anders" ? (x.andersManier ?? "handmatig") : x.andersManier }))}
              className={`rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${k.cms === id ? "border-accent bg-accent/10" : "border-line hover:border-accent/40"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {k.cms === "wordpress" && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Veld label="Adres WordPress-site" breed>
              <input value={k.wpUrl ?? ""} onChange={(e) => zetK("wpUrl", e.target.value)} className="veld" />
            </Veld>
            <Veld label="Gebruikersnaam">
              <input value={k.wpGebruiker ?? ""} onChange={(e) => zetK("wpGebruiker", e.target.value)} className="veld" />
            </Veld>
            <Veld label="Application Password">
              <input value={k.wpWachtwoord ?? ""} onChange={(e) => zetK("wpWachtwoord", e.target.value)} type="password" autoComplete="off" placeholder={opgeslagen(heeft.wp, "xxxx xxxx xxxx xxxx")} className="veld mono !text-xs" />
            </Veld>
          </div>
        )}
        {k.cms === "shopify" && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Veld label="Winkeladres (.myshopify.com)">
              <input value={k.shopWinkel ?? ""} onChange={(e) => zetK("shopWinkel", e.target.value)} className="veld" />
            </Veld>
            <Veld label="Admin API access token">
              <input value={k.shopToken ?? ""} onChange={(e) => zetK("shopToken", e.target.value)} type="password" autoComplete="off" placeholder={opgeslagen(heeft.shop, "shpat_…")} className="veld mono !text-xs" />
            </Veld>
            <Veld label="Blog (optioneel)" breed>
              <input value={k.shopBlogId ?? ""} onChange={(e) => zetK("shopBlogId", e.target.value)} placeholder="Leeg = eerste blog" className="veld" />
            </Veld>
          </div>
        )}
        {k.cms === "anders" && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(
                [
                  ["handmatig", "Kopiëren en plakken"],
                  ["api", "Eigen koppeling (API)"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setK((x) => ({ ...x, andersManier: id }))} className={`rounded-xl border p-3 text-left text-sm font-semibold ${k.andersManier === id ? "border-accent bg-accent/10" : "border-line"}`}>
                  {label}
                </button>
              ))}
            </div>
            {k.andersManier === "api" && (
              <div className="grid gap-4">
                <Veld label="Adres van je blog-koppeling">
                  <input value={k.apiUrl ?? ""} onChange={(e) => zetK("apiUrl", e.target.value)} className="veld mono !text-xs" />
                </Veld>
                <Veld label="API-sleutel (x-api-key)">
                  <input value={k.apiSleutel ?? ""} onChange={(e) => zetK("apiSleutel", e.target.value)} type="password" autoComplete="off" placeholder={opgeslagen(heeft.api)} className="veld mono !text-xs" />
                </Veld>
              </div>
            )}
          </div>
        )}
        {k.cms !== "geen" && <CmsUitleg cms={k.cms} />}
        {k.cms !== "geen" && (
          <button onClick={() => test("site")} disabled={bezig !== null} className="btn mt-4">
            {bezig === "site" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test verbinding (na opslaan)
          </button>
        )}
      </Blok>

      <Blok icoon={<LayoutTemplate className="h-4 w-4" />} titel="Opmaak op je site" uitleg="Met de gratis plugin R7N Blog (WordPress) krijgen je blogs een vaste, nette opmaak met inhoudsopgave, actieblokken, tips en uitklapbare vragen.">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line p-4">
          <span className="text-sm font-medium">De plugin R7N Blog staat op mijn WordPress-site</span>
          <input type="checkbox" checked={o.plugin} onChange={(e) => setO({ ...o, plugin: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
        </label>
        {o.plugin && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(CTA_SOORTEN) as CtaSoort[]).map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={o.ctas.includes(c)}
                  onChange={(e) => setO({ ...o, ctas: e.target.checked ? [...o.ctas, c] : o.ctas.filter((x) => x !== c) })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {CTA_SOORTEN[c]}
              </label>
            ))}
          </div>
        )}
      </Blok>

      <div className="flex justify-end">
        <button onClick={opslaan} disabled={bezig !== null} className="btn btn-vol">
          {bezig === "opslaan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Opslaan
        </button>
      </div>
    </div>
  );
}

function Blok({ icoon, titel, uitleg, children }: { icoon: ReactNode; titel: string; uitleg?: string; children: ReactNode }) {
  return (
    <section className="kaart p-6">
      <h2 className="kop flex items-center gap-2">
        <span className="text-accent">{icoon}</span>
        {titel}
      </h2>
      {uitleg ? <p className="mt-1 mb-5 text-sm text-muted">{uitleg}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

function Veld({ label, breed = false, children }: { label: string; breed?: boolean; children: ReactNode }) {
  return (
    <label className={`lbl block !text-[9.5px] ${breed ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}
