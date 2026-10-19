"use client";

import { ArrowLeft, CalendarClock, CircleAlert, CircleCheck, Clipboard, Download, ExternalLink, FileUp, ImageIcon, Loader2, RefreshCw, Rocket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { blokkerend, kwaliteit } from "@/lib/kwaliteit";
import { naarHtml } from "@/lib/markdown";
import { CTA_SOORTEN, type Blog, type Cms } from "@/lib/types";
import { bewaarBlog, kopieerVersie, markeerLive, nieuweAfbeelding, verwijder, zetOpSite } from "../../acties";

type Omgeving = { site: string; cms: Cms; automatisch: boolean; plugin: boolean; adresVrij: boolean | null; categorieen: string[] };

// Bouwstenen zichtbaar maken in het voorbeeld (op de site toont de R7N Blog-plugin ze in je huisstijl).
function voorbeeld(md: string): string {
  return naarHtml(md)
    .replace(/\[r7n_cta\s+type="(\w+)"\s*\]/g, (_m, t: string) => `<aside class="vb-cta"><small>Actieblok · ${CTA_SOORTEN[t as keyof typeof CTA_SOORTEN] ?? t}</small><b>Wordt op je site getoond met een knop</b></aside>`)
    .replace(/\[r7n_tip(?:\s+titel="([^"]*)")?\s*\]([\s\S]*?)\[\/r7n_tip\]/g, (_m, t: string | undefined, x: string) => `<div class="vb-tip"><small>${t ?? "Tip"}</small><p>${x}</p></div>`);
}

const lokaal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function morgenOchtend() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return lokaal(d);
}

export function Editor({ begin, omgeving }: { begin: Blog; omgeving: Omgeving }) {
  const router = useRouter();
  const [b, setB] = useState(begin);
  const [weergave, setWeergave] = useState<"voorbeeld" | "bewerken">("voorbeeld");
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [wanneer, setWanneer] = useState(morgenOchtend);
  const [liveUrl, setLiveUrl] = useState("");
  const zet = <K extends keyof Blog>(k: K, v: Blog[K]) => setB((x) => ({ ...x, [k]: v }));

  const html = useMemo(() => voorbeeld(b.tekst), [b.tekst]);
  const checks = useMemo(
    () => kwaliteit(b, omgeving.site, omgeving.cms, omgeving.plugin, b.adres === begin.adres ? omgeving.adresVrij : null),
    [b, begin.adres, omgeving]
  );
  const open = blokkerend(checks);
  const live = b.status === "live";
  const velden = () => ({ titel: b.titel, adres: b.adres, intro: b.intro, tekst: b.tekst, meta: b.meta, categorie: b.categorie, tags: b.tags, beeldPrompt: b.beeldPrompt });

  async function actie(label: string, fn: () => Promise<{ ok: true; data: Blog | null } | { ok: false; fout: string }>, tekst: string) {
    setBezig(label);
    setMelding(null);
    const r = await fn();
    setBezig(null);
    if (!r.ok) return setMelding({ ok: false, tekst: r.fout });
    if (r.data) setB(r.data);
    setMelding({ ok: true, tekst });
    router.refresh();
  }

  async function kopieer(soort: "html" | "markdown") {
    const r = await kopieerVersie(b.id);
    if (!r.ok) return setMelding({ ok: false, tekst: r.fout });
    await navigator.clipboard.writeText(r.data[soort]);
    setMelding({ ok: true, tekst: soort === "html" ? "HTML gekopieerd. Plak het in de HTML- of code-weergave van je editor." : "Tekst gekopieerd (Markdown)." });
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={live ? "/live" : b.status === "gepland" ? "/planning" : "/concepten"} className="btn-stil inline-flex items-center gap-1.5 !text-muted hover:!text-text">
          <ArrowLeft className="h-4 w-4" /> Terug
        </Link>
        <div className="flex gap-1 rounded-lg border border-line p-1">
          {(["voorbeeld", "bewerken"] as const).map((w) => (
            <button key={w} onClick={() => setWeergave(w)} className={`rounded-md px-3 py-1.5 text-[13px] capitalize ${weergave === w ? "bg-accent text-accent-ink" : "text-muted hover:text-text"}`}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {melding && <div className={`melding mb-4 px-4 py-3 text-sm ${melding.ok ? "border-ok/30 bg-ok/10 text-ok" : "melding-rood text-bad"}`}>{melding.tekst}</div>}
      {b.fout && <div className="melding melding-geel mb-4 px-4 py-3 text-sm text-warn">{b.fout}</div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <article className="kaart overflow-hidden">
          {b.beeld ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/beeld/${b.beeld}`} alt={b.titel} className="aspect-[16/8] w-full object-cover" />
          ) : (
            <div className="flex aspect-[16/8] items-center justify-center bg-surface2 text-muted">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          <div className="p-6 md:p-10">
            {weergave === "voorbeeld" ? (
              <>
                <div className="lbl !text-[9.5px]">{b.categorie || "Blog"}</div>
                <h1 className="titel mt-2 text-[2.2rem] leading-tight md:text-[2.8rem]">{b.titel}</h1>
                {b.intro && <p className="mt-4 text-lg text-muted">{b.intro}</p>}
                <div className="blog-inhoud mt-8" dangerouslySetInnerHTML={{ __html: html }} />
              </>
            ) : (
              <div className="space-y-5">
                <Veld label={`Titel · ${b.titel.length}/65`}>
                  <input value={b.titel} onChange={(e) => zet("titel", e.target.value)} disabled={live} className="veld !text-lg !font-semibold" />
                </Veld>
                <Veld label="Samenvatting">
                  <textarea value={b.intro} onChange={(e) => zet("intro", e.target.value)} disabled={live} rows={2} className="veld" />
                </Veld>
                <Veld label="Tekst (Markdown)">
                  <textarea value={b.tekst} onChange={(e) => zet("tekst", e.target.value)} disabled={live} rows={28} className="veld mono !text-xs !leading-relaxed" />
                </Veld>
                {!live && (
                  <button onClick={() => actie("bewaar", () => bewaarBlog(b.id, velden()), "Opgeslagen.")} disabled={bezig !== null} className="btn">
                    {bezig === "bewaar" && <Loader2 className="h-4 w-4 animate-spin" />} Opslaan
                  </button>
                )}
              </div>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <Blok titel="Naar je site" icoon={<Rocket className="h-4 w-4" />}>
            {live ? (
              <div className="space-y-3 text-sm">
                <p className="text-ok">Staat live{b.liveOp ? ` sinds ${new Date(b.liveOp).toLocaleDateString("nl-NL")}` : ""}.</p>
                {b.liveUrl && (
                  <a href={b.liveUrl} target="_blank" rel="noreferrer" className="btn w-full">
                    Bekijk op je site <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : omgeving.automatisch ? (
              <div className="space-y-3">
                {open.length > 0 && <p className="text-xs text-bad">Eerst de rode punten in de kwaliteitscheck oplossen.</p>}
                {b.status === "gepland" && b.geplandVoor && <p className="text-xs text-accent">Ingepland voor {new Date(b.geplandVoor).toLocaleString("nl-NL")}. Opnieuw inplannen verschuift de datum.</p>}
                <button onClick={() => actie("live", () => zetOpSite(b.id, velden(), "live"), "Staat live op je site.")} disabled={bezig !== null || open.length > 0} className="btn btn-vol w-full">
                  {bezig === "live" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Zet nu live
                </button>
                <div className="rounded-lg border border-line p-3">
                  <Veld label="Inplannen op">
                    <input type="datetime-local" value={wanneer} onChange={(e) => setWanneer(e.target.value)} className="veld" />
                  </Veld>
                  <button
                    onClick={() => actie("plan", () => zetOpSite(b.id, velden(), "gepland", new Date(wanneer).toISOString()), "Ingepland. Je site zet hem op dat moment zelf live; je computer hoeft niet aan te staan.")}
                    disabled={bezig !== null || open.length > 0}
                    className="btn mt-3 w-full"
                  >
                    {bezig === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Inplannen
                  </button>
                </div>
                <button onClick={() => actie("concept", () => zetOpSite(b.id, velden(), "concept"), "Als concept op je site gezet. Je vindt hem daar bij de concepten.")} disabled={bezig !== null} className="btn-stil inline-flex items-center gap-1.5 !text-muted hover:!text-text">
                  <FileUp className="h-3.5 w-3.5" /> Alleen als concept op je site zetten
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-muted">Je site is niet automatisch gekoppeld. Kopieer de blog en plak hem in je eigen platform.</p>
                <button onClick={() => kopieer("html")} className="btn w-full">
                  <Clipboard className="h-4 w-4" /> Kopieer als HTML
                </button>
                <button onClick={() => kopieer("markdown")} className="btn w-full">
                  <Clipboard className="h-4 w-4" /> Kopieer als tekst
                </button>
                {b.beeld && (
                  <a href={`/beeld/${b.beeld}`} download={`${b.adres || "blog"}.webp`} className="btn w-full">
                    <Download className="h-4 w-4" /> Download afbeelding
                  </a>
                )}
                <div className="rounded-lg border border-line p-3">
                  <Veld label="Geplaatst? Adres van de blog (optioneel)">
                    <input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://…" className="veld" />
                  </Veld>
                  <button onClick={() => actie("markeer", () => markeerLive(b.id, liveUrl), "Gemarkeerd als live.")} disabled={bezig !== null} className="btn mt-3 w-full">
                    Markeer als live
                  </button>
                </div>
              </div>
            )}
          </Blok>

          {!live && (
            <Blok titel="Kwaliteitscheck" icoon={<CircleCheck className="h-4 w-4" />} rechts={open.length ? <span className="text-bad">{open.length} verplicht open</span> : <span className="text-ok">klaar</span>}>
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-xs">
                    {c.ok ? <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" /> : <CircleAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${c.verplicht ? "text-bad" : "text-warn"}`} />}
                    <span>
                      <span className={c.ok ? "" : "font-medium"}>{c.label}</span>
                      <span className="block text-muted">{c.uitleg}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Blok>
          )}

          <Blok titel="Afbeelding" icoon={<ImageIcon className="h-4 w-4" />}>
            <Veld label="Omschrijving (Engels werkt het best)">
              <textarea value={b.beeldPrompt} onChange={(e) => zet("beeldPrompt", e.target.value)} rows={4} disabled={live} className="veld !text-xs" />
            </Veld>
            {!live && (
              <button onClick={() => actie("beeld", () => nieuweAfbeelding(b.id, b.beeldPrompt), "Nieuwe afbeelding gemaakt.")} disabled={bezig !== null} className="btn mt-3 w-full">
                {bezig === "beeld" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {bezig === "beeld" ? "Maken… (±1 min)" : b.beeld ? "Maak een nieuwe" : "Maak afbeelding"}
              </button>
            )}
          </Blok>

          <Blok titel="Zoekmachines">
            <div className="space-y-3">
              <Veld label="Adres (slug)">
                <input value={b.adres} onChange={(e) => zet("adres", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} disabled={live} className="veld mono !text-xs" />
              </Veld>
              <Veld label={`Meta description · ${b.meta.length}/160`}>
                <textarea value={b.meta} onChange={(e) => zet("meta", e.target.value)} rows={3} disabled={live} className="veld !text-xs" />
              </Veld>
              {omgeving.categorieen.length > 0 && (
                <Veld label="Categorie">
                  <select value={b.categorie} onChange={(e) => zet("categorie", e.target.value)} disabled={live} className="veld">
                    <option value="">— kies —</option>
                    {omgeving.categorieen.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Veld>
              )}
              <Veld label="Tags (met komma's)">
                <input value={b.tags.join(", ")} onChange={(e) => zet("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} disabled={live} className="veld !text-xs" />
              </Veld>
              {!live && (
                <button onClick={() => actie("bewaar2", () => bewaarBlog(b.id, velden()), "Opgeslagen.")} disabled={bezig !== null} className="btn w-full">
                  {bezig === "bewaar2" && <Loader2 className="h-4 w-4 animate-spin" />} Opslaan
                </button>
              )}
            </div>
          </Blok>

          <button
            onClick={async () => {
              if (!confirm(live ? "Deze blog uit de studio verwijderen? Op je site blijft hij staan." : "Deze blog verwijderen? Een concept of geplande versie op je site wordt ook verwijderd.")) return;
              const r = await verwijder(b.id);
              if (r.ok) router.push("/concepten");
              else setMelding({ ok: false, tekst: r.fout });
            }}
            className="btn btn-gevaar w-full"
          >
            <Trash2 className="h-4 w-4" /> Verwijderen
          </button>
        </aside>
      </div>
    </>
  );
}

function Blok({ titel, icoon, rechts, children }: { titel: string; icoon?: ReactNode; rechts?: ReactNode; children: ReactNode }) {
  return (
    <section className="kaart p-5">
      <h3 className="kop mb-3 flex items-center gap-2">
        {icoon && <span className="text-accent">{icoon}</span>}
        {titel}
        {rechts && <span className="lbl ml-auto !text-[9.5px]">{rechts}</span>}
      </h3>
      {children}
    </section>
  );
}

function Veld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="lbl block !text-[9.5px]">
      {label}
      {children}
    </label>
  );
}
