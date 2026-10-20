"use client";

import { AlertTriangle, Check, ChevronDown, Copy, Loader2, MapPin, MessageSquare, Radar, RefreshCw, Sparkles, Star, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bezig } from "@/components/Bezig";
import { Tegel } from "@/components/ui";
import type { Check as CheckT, LokaalAnalyse, ProfielAnalyse, Punt } from "@/lib/lokaal";
import { analyseer, reviewsBijwerken, tekstenOpnieuw } from "./acties";

const PUNTEN: Punt[] = ["N", "O", "Z", "W"];
const scoreKleur = (s: number) => (s >= 75 ? "text-ok" : s >= 50 ? "text-warn" : "text-bad");
const posKleur = (p: number | null) => (p === null ? "text-bad" : p <= 3 ? "text-ok" : p <= 7 ? "text-warn" : "text-bad");
const IMPACT = { hoog: "border-accent/50 bg-accent/10 text-accent", middel: "border-warn/40 bg-warn/10 text-warn", laag: "border-line bg-surface-2 text-muted" };
const gemPositie = (p: ProfielAnalyse) => (p.metingen.length ? p.metingen.reduce((t, m) => t + (m.positie ?? 21), 0) / p.metingen.length : null);

const Chip = ({ klasse, children }: { klasse: string; children: ReactNode }) => (
  <span className={`mono inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${klasse}`}>{children}</span>
);

function Kopieer({ tekst }: { tekst: string }) {
  const [klaar, setKlaar] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(tekst);
        setKlaar(true);
        setTimeout(() => setKlaar(false), 1500);
      }}
      className="btn shrink-0 !px-2.5 !py-1.5 text-xs"
    >
      {klaar ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />} {klaar ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}

function Blok({ titel, sub, children, rechts }: { titel: string; sub?: string; children: ReactNode; rechts?: ReactNode }) {
  return (
    <div className="border-t border-line px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="lbl">{titel}</div>
          {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
        </div>
        {rechts}
      </div>
      {children}
    </div>
  );
}

const CheckIcoon = ({ c }: { c: CheckT }) =>
  c.ok === null ? <span className="h-4 w-4 text-center text-muted">·</span> : c.ok ? <Check className="h-4 w-4 text-ok" /> : <X className="h-4 w-4 text-bad" />;

function ProfielKaart({ p, open, wissel, ai, onNieuw }: { p: ProfielAnalyse; open: boolean; wissel: () => void; ai: boolean; onNieuw: (a: LokaalAnalyse) => void }) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const d = p.data;
  const woorden = [...new Set(p.metingen.map((m) => m.zoekwoord))];

  async function opnieuw() {
    setBezig(true);
    setFout(null);
    const r = await tekstenOpnieuw(p.profiel_id);
    setBezig(false);
    if (r.ok) onNieuw(r.data);
    else setFout(r.fout);
  }

  return (
    <div className="kaart overflow-hidden">
      <button onClick={wissel} className="flex w-full items-center gap-4 p-5 text-left">
        <div className="w-14 shrink-0 text-center">
          <div className={`mono text-2xl font-bold ${d ? scoreKleur(p.score) : "text-muted"}`}>{d ? p.score : "–"}</div>
          <div className="lbl !text-[8.5px]">score</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{d?.naam ?? p.naam}</div>
          <div className="truncate text-xs text-muted">{d?.adres}</div>
          {p.fout ? (
            <div className="mt-1 text-sm text-bad">{p.fout}</div>
          ) : (
            p.kansen[0] && (
              <div className="mt-1 truncate text-sm text-muted">
                Grootste kans: <span className="text-text">{p.kansen[0].titel}</span>
              </div>
            )
          )}
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && d && (
        <>
          {p.kansen.length > 0 && (
            <Blok titel="Top-kansen" sub="Op volgorde van wat het meeste oplevert">
              <ol className="space-y-3">
                {p.kansen.map((k, i) => (
                  <li key={k.titel} className="flex gap-3">
                    <span className="mono mt-0.5 w-5 shrink-0 text-sm text-muted">{i + 1}.</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{k.titel}</span>
                        <Chip klasse={IMPACT[k.impact]}>{k.impact}</Chip>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">{k.actie}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Blok>
          )}

          <Blok titel="Checklist">
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {p.checks.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 shrink-0">
                    <CheckIcoon c={c} />
                  </span>
                  <div className="min-w-0">
                    <span className={c.ok === false ? "text-text" : "text-muted"}>{c.label}</span>
                    <span className="text-muted"> · {c.uitleg}</span>
                  </div>
                </div>
              ))}
            </div>
          </Blok>

          {woorden.length > 0 && (
            <Blok titel="Positie in Google Maps" sub="Gezocht vanaf ±2 km ten noorden, oosten, zuiden en westen van de winkel">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="lbl !text-[9px] pb-2 font-normal">Zoekwoord</th>
                      {PUNTEN.map((pt) => (
                        <th key={pt} className="lbl !text-[9px] pb-2 text-center font-normal">
                          {pt}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {woorden.map((w) => (
                      <tr key={w} className="border-t border-line">
                        <td className="py-2">{w}</td>
                        {PUNTEN.map((pt) => {
                          const pos = p.metingen.find((m) => m.zoekwoord === w && m.punt === pt)?.positie ?? null;
                          return (
                            <td key={pt} className={`mono py-2 text-center font-medium ${posKleur(pos)}`}>
                              {pos ?? ">20"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Blok>
          )}

          {p.concurrenten.length > 0 && (
            <Blok titel="Concurrenten die boven je staan">
              <div className="space-y-2">
                {p.concurrenten.map((c) => (
                  <div key={c.cid} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{c.naam}</span>
                    <span className="text-muted">
                      <Star className="inline h-3 w-3 -translate-y-px fill-current text-warn" /> {c.sterren ?? "–"} ({c.reviews ?? 0})
                    </span>
                    <span className="text-muted">{c.fotos ?? 0} foto&apos;s</span>
                    <span className="text-muted">{c.categorie}</span>
                    <span className="text-muted">{c.boven}× boven je</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted">
                Jij: <Star className="inline h-3 w-3 -translate-y-px fill-current text-warn" /> {d.sterren ?? "–"} ({d.reviews}) · {d.fotos} foto&apos;s · {d.categorie}
              </div>
            </Blok>
          )}

          <Blok titel="Reviews">
            {p.reviews.status === "wacht" ? (
              <p className="text-sm text-muted">De nieuwste reviews staan nog in de wachtrij van DataForSEO. Klik bovenaan op Reviews bijwerken.</p>
            ) : p.reviews.status === "mislukt" ? (
              <p className="text-sm text-muted">De reviews konden niet worden opgehaald.</p>
            ) : (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  <strong>{p.reviews.beantwoord}</strong>/{p.reviews.opgehaald} van de nieuwste beantwoord
                </span>
                <span>
                  <strong className={p.reviews.negatief_open ? "text-bad" : ""}>{p.reviews.negatief_open}</strong> negatieve open
                </span>
                <span>
                  <strong>{p.reviews.laatste_90}</strong> in de laatste 90 dagen
                </span>
              </div>
            )}
            {Object.keys(d.themas).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(d.themas)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([t, n]) => (
                    <span key={t} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
                      {t} <span className="mono">{n}</span>
                    </span>
                  ))}
              </div>
            )}
          </Blok>

          <Blok
            titel="Teksten om door te voeren"
            sub={p.teksten ? "Kopieer en plak ze in het profiel bij Google" : ai ? "Nog geen teksten" : "Vul je OpenRouter-sleutel in bij Instellingen, dan schrijft de studio deze teksten"}
            rechts={
              ai && (
                <button onClick={opnieuw} disabled={bezig} className="btn !py-1.5 text-xs">
                  {bezig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {p.teksten ? "Opnieuw schrijven" : "Schrijf teksten"}
                </button>
              )
            }
          >
            {fout && <div className="melding melding-rood mb-3 px-3 py-2 text-sm text-bad">{fout}</div>}
            {p.teksten && (
              <div className="space-y-5">
                {p.teksten.beschrijving && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Nieuwe beschrijving ({p.teksten.beschrijving.length} tekens)</span>
                      <Kopieer tekst={p.teksten.beschrijving} />
                    </div>
                    <p className="whitespace-pre-line rounded-xl bg-surface-2/50 p-3.5 text-sm leading-relaxed">{p.teksten.beschrijving}</p>
                  </div>
                )}
                {p.teksten.berichten.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-sm font-medium">Google-berichten</div>
                    <div className="space-y-2.5">
                      {p.teksten.berichten.map((b, i) => (
                        <div key={i} className="flex gap-3 rounded-xl bg-surface-2/50 p-3.5">
                          <p className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed">{b}</p>
                          <Kopieer tekst={b} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {p.teksten.review_antwoorden.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-sm font-medium">Antwoorden op open reviews</div>
                    <div className="space-y-2.5">
                      {p.teksten.review_antwoorden.map((r, i) => (
                        <div key={i} className="rounded-xl bg-surface-2/50 p-3.5">
                          <p className="flex gap-2 text-xs italic text-muted">
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-3">{r.review}</span>
                          </p>
                          <div className="mt-2 flex gap-3">
                            <p className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed">{r.antwoord}</p>
                            <Kopieer tekst={r.antwoord} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {p.teksten.observaties.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-sm font-medium">Wat verder opvalt</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                      {p.teksten.observaties.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Blok>
        </>
      )}
    </div>
  );
}

export function LokaalView({
  begin,
  aantalProfielen,
  dfs,
  ai,
  fout: beginFout,
}: {
  begin: LokaalAnalyse | null;
  aantalProfielen: number;
  dfs: { werkt: boolean; melding: string };
  ai: boolean;
  fout: string | null;
}) {
  const [a, setA] = useState(begin);
  const [bezig, setBezig] = useState<"analyse" | "reviews" | null>(null);
  const [fout, setFout] = useState<string | null>(beginFout);
  const [open, setOpen] = useState<string | null>(null);

  async function start() {
    setBezig("analyse");
    setFout(null);
    const r = await analyseer();
    setBezig(null);
    if (r.ok) setA(r.data);
    else setFout(r.fout);
  }

  async function reviews() {
    setBezig("reviews");
    setFout(null);
    const r = await reviewsBijwerken();
    setBezig(null);
    if (r.ok) setA(r.data);
    else setFout(r.fout);
  }

  if (bezig === "analyse")
    return (
      <Bezig
        titel="De bedrijfsprofielen worden geanalyseerd"
        seconden={120 + aantalProfielen * 20}
        stappen={["Profielen ophalen bij Google", "Positie in Maps meten rond elke winkel", "Vestigingspagina's vergelijken", "Nieuwste reviews lezen", "Score en kansen berekenen", ...(ai ? ["Teksten schrijven met Claude"] : [])]}
      />
    );

  const lijst = a?.profielen ?? [];
  const metData = lijst.filter((p) => p.data);
  const gem = metData.length ? Math.round(metData.reduce((t, p) => t + p.score, 0) / metData.length) : null;
  const negOpen = lijst.reduce((t, p) => t + p.reviews.negatief_open, 0);
  const reviewsWacht = lijst.some((p) => p.reviews.status === "wacht");

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Hoe staan de Google Bedrijfsprofielen ervoor, en wat levert het meeste op? Per vestiging een score, de positie in Google Maps, concurrenten, reviews en kant-en-klare teksten.
        </p>
        <div className="flex flex-wrap gap-2">
          {reviewsWacht && (
            <button onClick={reviews} disabled={bezig !== null} className="btn">
              {bezig === "reviews" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Reviews bijwerken
            </button>
          )}
          <button onClick={start} disabled={bezig !== null || !aantalProfielen || !dfs.werkt} className={a ? "btn" : "btn btn-vol"}>
            <Radar className="h-4 w-4" /> {a ? "Opnieuw analyseren" : "Analyseer bedrijfsprofielen"}
          </button>
          {a && (
            <Link href="/lokaal/oplossen" className="btn btn-vol">
              <Wand2 className="h-4 w-4" /> Los alles op
            </Link>
          )}
        </div>
      </div>

      <div className="lbl mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 !text-[9.5px]">
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dfs.werkt ? "bg-ok" : "bg-bad"}`} /> DataForSEO · {dfs.melding}
        </span>
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${ai ? "bg-ok" : "bg-warn"}`} /> Teksten {ai ? "aan" : "uit (geen OpenRouter-sleutel)"}
        </span>
      </div>

      {a?.waarschuwing && (
        <div className="melding melding-geel mb-4 flex gap-3 px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {a.waarschuwing}
        </div>
      )}
      {fout && <div className="melding melding-rood mb-4 px-4 py-3 text-sm text-bad">{fout}</div>}

      {!aantalProfielen ? (
        <div className="kaart p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted" />
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">Nog geen bedrijfsprofielen. Voeg eerst je vestigingen toe; daarna analyseert de studio ze in één keer.</p>
          <Link href="/lokaal/profielen" className="btn btn-vol mt-5">
            <MapPin className="h-4 w-4" /> Profielen toevoegen
          </Link>
        </div>
      ) : !a ? (
        <div className="kaart p-12 text-center">
          <Radar className="mx-auto h-10 w-10 text-muted" />
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            {aantalProfielen} profiel(en) klaar. Een analyse kost ongeveer $0,03 per profiel bij DataForSEO{ai ? ", plus de teksten via OpenRouter" : ""}.
          </p>
          <button onClick={start} disabled={!dfs.werkt} className="btn btn-vol mt-5">
            <Radar className="h-4 w-4" /> Analyseer bedrijfsprofielen
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tegel label="Profielen" value={lijst.length} stip="accent" />
            <Tegel label="Gemiddelde score" value={gem ?? "–"} sub="van 100" stip={gem === null ? undefined : gem >= 75 ? "ok" : gem >= 50 ? "warn" : "bad"} />
            <Tegel label="Negatieve reviews open" value={negOpen} sub="van de nieuwste 30 per profiel" stip={negOpen ? "bad" : "ok"} />
            <Tegel label="Kosten analyse" value={`$${a.kosten.toFixed(2)}`} sub="DataForSEO" />
          </div>
          <div className="lbl mt-2 !text-[9.5px]">
            Analyse van {new Date(a.gemaakt).toLocaleString("nl-NL")}
            {aantalProfielen !== lijst.length && " · het aantal profielen is veranderd; analyseer opnieuw"}
          </div>

          <div className="kaart mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left">
                  {["Vestiging", "Score", "Sterren", "Reviews", "Beantwoord", "Foto's", "Beschrijving", "Maps"].map((h) => (
                    <th key={h} className="lbl !text-[9px] px-4 py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lijst.map((p) => {
                  const gp = gemPositie(p);
                  return (
                    <tr
                      key={p.profiel_id}
                      onClick={() => {
                        setOpen(p.profiel_id);
                        document.getElementById(`profiel-${p.profiel_id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="cursor-pointer border-t border-line hover:bg-surface-2/40"
                    >
                      <td className="px-4 py-2.5 font-medium">{p.data?.naam ?? p.naam}</td>
                      <td className={`mono px-4 py-2.5 font-bold ${p.data ? scoreKleur(p.score) : "text-muted"}`}>{p.data ? p.score : "–"}</td>
                      <td className="px-4 py-2.5">{p.data?.sterren?.toFixed(1) ?? "–"}</td>
                      <td className="px-4 py-2.5">{p.data?.reviews ?? "–"}</td>
                      <td className="px-4 py-2.5">{p.reviews.status === "klaar" ? `${p.reviews.beantwoord}/${p.reviews.opgehaald}` : "…"}</td>
                      <td className="px-4 py-2.5">{p.data?.fotos ?? "–"}</td>
                      <td className="px-4 py-2.5">{p.data ? (p.data.beschrijving.length ? `${p.data.beschrijving.length} tekens` : "geen") : "–"}</td>
                      <td className={`mono px-4 py-2.5 ${gp === null ? "text-muted" : posKleur(Math.round(gp))}`}>{gp === null ? "–" : gp.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 space-y-3">
            {lijst.map((p) => (
              <div key={p.profiel_id} id={`profiel-${p.profiel_id}`} className="scroll-mt-4">
                <ProfielKaart p={p} open={open === p.profiel_id} wissel={() => setOpen(open === p.profiel_id ? null : p.profiel_id)} ai={ai} onNieuw={setA} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
