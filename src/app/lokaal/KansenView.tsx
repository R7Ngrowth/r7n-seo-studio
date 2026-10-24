"use client";

import { AlertTriangle, Check, ChevronDown, Copy, ExternalLink, Lightbulb, Loader2, MapPin, Radar, Send, Star, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Bezig } from "@/components/Bezig";
import { Tegel } from "@/components/ui";
import type { Check as CheckT, LokaalAnalyse, ProfielAnalyse, Punt } from "@/lib/lokaal";
import { kansenVoor } from "@/lib/lokaal-kansen";
import type { Suggestie } from "@/lib/lokaal-oplossen";
import type { SuggestieStand } from "@/lib/opslag";
import { analyseer, markeerSuggestie } from "./acties";

// Per vestiging: de kansen met waarom, de stappen (waar je klikt) en de tekst om te plakken,
// plus meer kansen, een wekelijks Google-bericht, de checklist, de positie in Maps en de concurrenten.
// Je voert alles zelf door in je profiel op Google.

const PUNTEN: Punt[] = ["N", "O", "Z", "W"];
const scoreKleur = (s: number) => (s >= 75 ? "text-ok" : s >= 50 ? "text-warn" : "text-bad");
const posKleur = (p: number | null) => (p === null ? "text-bad" : p <= 3 ? "text-ok" : p <= 7 ? "text-warn" : "text-bad");
const IMPACT = { hoog: "border-accent/50 bg-accent/10 text-accent", middel: "border-warn/40 bg-warn/10 text-warn", laag: "border-line bg-surface-2 text-muted" };
const gemPositie = (p: ProfielAnalyse) => (p.metingen.length ? p.metingen.reduce((t, m) => t + (m.positie ?? 21), 0) / p.metingen.length : null);
// Kansen die bij een suggestie horen, gebruiken het id van die suggestie (zo blijft "gedaan" bewaard).
const SOORT: Record<string, Suggestie["soort"]> = { beschrijving: "beschrijving", extra_cat: "categorieen", link: "link" };

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

function Blok({ titel, sub, children }: { titel: string; sub?: string; children: ReactNode }) {
  return (
    <div className="border-t border-line px-5 py-4">
      <div className="mb-3">
        <div className="lbl">{titel}</div>
        {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

const CheckIcoon = ({ c }: { c: CheckT }) =>
  c.ok === null ? <span className="h-4 w-4 text-center text-muted">·</span> : c.ok ? <Check className="h-4 w-4 text-ok" /> : <X className="h-4 w-4 text-bad" />;

// Kansen met de voorstellen uit de meting erin (nieuwe beschrijving, categorieën, link met meetcode).
function kansenMet(p: ProfielAnalyse, suggesties: Suggestie[]) {
  const s = (soort: Suggestie["soort"]) => suggesties.find((x) => x.profiel_id === p.profiel_id && x.soort === soort)?.tekst;
  return kansenVoor(p, { beschrijving: s("beschrijving"), categorieen: s("categorieen")?.split("\n").filter(Boolean), link: s("link") });
}

function Kaart({
  analyseId,
  p,
  open,
  wissel,
  suggesties,
  stand,
  onStand,
}: {
  analyseId: string;
  p: ProfielAnalyse;
  open: boolean;
  wissel: () => void;
  suggesties: Suggestie[];
  stand: SuggestieStand;
  onStand: (s: SuggestieStand) => void;
}) {
  const [bezig, setBezig] = useState<string | null>(null);
  const d = p.data;
  const woorden = [...new Set(p.metingen.map((m) => m.zoekwoord))];
  const eigen = suggesties.filter((s) => s.profiel_id === p.profiel_id);
  const { kansen, meer } = kansenMet(p, suggesties);
  const idVoor = (kansId: string) => eigen.find((s) => s.soort === SOORT[kansId])?.id ?? `${analyseId}:${p.profiel_id}:kans:${kansId}`;
  const gedaan = (id: string) => stand[id]?.status === "gedaan";
  const berichten = eigen.filter((s) => s.soort === "bericht");
  const bericht = berichten.find((s) => !gedaan(s.id));
  const tekst = (s: Suggestie) => stand[s.id]?.tekst ?? s.tekst;
  const open_ = kansen.filter((k) => !gedaan(idVoor(k.id)));

  async function zet(id: string, status: "open" | "gedaan") {
    setBezig(id);
    const r = await markeerSuggestie(id, { status });
    setBezig(null);
    if (r.ok) onStand(r.data);
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
            open_[0] && (
              <div className="mt-1 truncate text-sm text-muted">
                Grootste kans: <span className="text-text">{open_[0].titel}</span>
              </div>
            )
          )}
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && d && (
        <>
          <div className="-mt-2 px-5 pb-3">
            <a href={`https://www.google.com/maps?cid=${p.cid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent">
              Open profiel in Google Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {kansen.length > 0 && (
            <Blok titel="Kansen en wat je doet" sub="Op volgorde van wat het meeste oplevert. Per kans: waarom, de stappen en de tekst om te plakken.">
              <ol className="space-y-4">
                {kansen.map((k, i) => {
                  const id = idVoor(k.id);
                  const klaar = gedaan(id);
                  return (
                    <li key={k.id} className={`rounded-xl border border-line p-4 ${klaar ? "opacity-60" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono text-sm text-muted">{i + 1}.</span>
                        <span className="font-medium">{k.titel}</span>
                        <Chip klasse={IMPACT[k.impact]}>{k.impact}</Chip>
                        {k.punten >= 1 && <span className="text-xs text-ok">+{Math.round(k.punten)} punten</span>}
                        {klaar && <Chip klasse="border-ok/40 bg-ok/10 text-ok">gedaan</Chip>}
                      </div>
                      {!klaar && (
                        <>
                          <p className="mt-1.5 text-sm text-muted">{k.waarom}</p>
                          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                            {k.stappen.map((st) => (
                              <li key={st}>{st}</li>
                            ))}
                          </ol>
                          {k.kopie && (
                            <div className="mt-3">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="lbl !text-[9px]">{k.kopieLabel ?? "Tekst"}</span>
                                <Kopieer tekst={k.kopie} />
                              </div>
                              <p className="whitespace-pre-line break-words rounded-lg bg-surface-2/50 p-3 text-sm leading-relaxed">{k.kopie}</p>
                            </div>
                          )}
                        </>
                      )}
                      <div className="mt-3 flex justify-end">
                        <button onClick={() => zet(id, klaar ? "open" : "gedaan")} disabled={bezig !== null} className="btn !px-2.5 !py-1.5 text-xs">
                          {bezig === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : klaar ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{" "}
                          {klaar ? "Toch nog niet gedaan" : "Gedaan"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Blok>
          )}

          {meer.length > 0 && (
            <Blok titel="Meer kansen" sub="Uit de vergelijking met de concurrenten en wat Claude verder opviel">
              <ul className="space-y-2.5">
                {meer.map((m) => (
                  <li key={m.titel} className="flex gap-2.5 text-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                    <span>
                      <span className="font-medium">{m.titel}.</span> {m.actie && <span className="text-muted">{m.actie}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Blok>
          )}

          <Blok titel="Google-bericht" sub="Eén bericht per week houdt je profiel actief. Plaats het via je profiel: Update toevoegen.">
            {bericht ? (
              <>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm">
                    <Send className="h-4 w-4 text-muted" /> Bericht voor {bericht.week ?? "deze week"}
                  </span>
                  <div className="flex gap-2">
                    <Kopieer tekst={tekst(bericht)} />
                    <button onClick={() => zet(bericht.id, "gedaan")} disabled={bezig !== null} className="btn !px-2.5 !py-1.5 text-xs">
                      {bezig === bericht.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Geplaatst
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-line rounded-lg bg-surface-2/50 p-3 text-sm leading-relaxed">{tekst(bericht)}</p>
              </>
            ) : (
              <p className="text-sm text-muted">
                {berichten.length ? "Alle voorgestelde berichten zijn geplaatst. Meet opnieuw voor nieuwe." : "Geen berichten: vul je OpenRouter-sleutel in bij Instellingen en meet opnieuw."}
              </p>
            )}
          </Blok>

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

          {(p.anderen?.length ?? 0) > 0 && (
            <Blok titel="Staan ook boven je, maar zijn geen concurrent" sub="Andere soorten bedrijven die op jouw zoekwoorden verschijnen. Hun categorieën en aanbod tellen niet mee in je kansen.">
              <div className="space-y-2">
                {p.anderen!.map((c) => (
                  <div key={c.cid} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="min-w-0 flex-1 truncate font-medium text-text">{c.naam}</span>
                    <span>{c.categorie}</span>
                    <span>{c.boven}× boven je</span>
                  </div>
                ))}
              </div>
              {p.concurrenten.length === 0 && (
                <p className="mt-3 text-xs text-muted">
                  Er staat geen bedrijf van jouw soort boven je. Verschijnen er vooral andere soorten bedrijven, kijk dan bij Profielen of je zoekwoorden kloppen met waarmee klanten jouw zaak zoeken.
                </p>
              )}
            </Blok>
          )}
        </>
      )}
    </div>
  );
}

export function KansenView({
  analyse,
  suggesties,
  stand: beginStand,
  aantalProfielen,
  dfs,
  ai,
}: {
  analyse: LokaalAnalyse | null;
  suggesties: Suggestie[];
  stand: SuggestieStand;
  aantalProfielen: number;
  dfs: { werkt: boolean; melding: string };
  ai: boolean;
}) {
  const router = useRouter();
  const [stand, setStand] = useState(beginStand);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  // Alle vestigingen staan standaard open: je ziet meteen per vestiging de kansen.
  const [dicht, setDicht] = useState<Set<string>>(new Set());
  const wissel = (id: string) =>
    setDicht((x) => {
      const n = new Set(x);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function meting() {
    setBezig(true);
    setFout(null);
    const r = await analyseer();
    setBezig(false);
    if (!r.ok) return setFout(r.fout);
    router.refresh();
  }

  if (bezig)
    return (
      <Bezig
        titel="Je bedrijfsprofielen worden gemeten"
        seconden={120 + aantalProfielen * 20}
        stappen={["Profielen ophalen bij Google", "Positie in Maps meten rond elke winkel", "Je eigen pagina vergelijken", "Kansen berekenen", ...(ai ? ["Teksten schrijven met Claude"] : [])]}
      />
    );

  const lijst = analyse?.profielen ?? [];
  const metData = lijst.filter((p) => p.data);
  const gem = metData.length ? Math.round(metData.reduce((t, p) => t + p.score, 0) / metData.length) : null;
  const aantalKansen = metData.reduce((t, p) => t + kansenMet(p, suggesties).kansen.length, 0);
  const analyseId = analyse?.id ?? "a";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Per vestiging de kansen met precies wat je doet, de positie in Google Maps en de concurrenten. Kopieer de teksten en plak ze in je profiel op Google; automatisch
          aanpassen kan alleen met een eigen Google Cloud-koppeling (Business Profile API).
        </p>
        <button onClick={meting} disabled={!aantalProfielen || !dfs.werkt} className={analyse ? "btn" : "btn btn-vol"}>
          <Radar className="h-4 w-4" /> {analyse ? "Nieuwe meting" : "Eerste meting"}
        </button>
      </div>

      <div className="lbl mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 !text-[9.5px]">
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dfs.werkt ? "bg-ok" : "bg-bad"}`} /> DataForSEO · {dfs.melding}
        </span>
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${ai ? "bg-ok" : "bg-warn"}`} /> Teksten {ai ? "aan" : "uit (geen OpenRouter-sleutel)"}
        </span>
      </div>

      {analyse?.waarschuwing && (
        <div className="melding melding-geel mb-4 flex gap-3 px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {analyse.waarschuwing}
        </div>
      )}
      {fout && <div className="melding melding-rood mb-4 px-4 py-3 text-sm text-bad">{fout}</div>}

      {!aantalProfielen ? (
        <div className="kaart p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted" />
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">Nog geen bedrijfsprofielen. Voeg je vestigingen toe bij Profielen.</p>
          <Link href="/lokaal/profielen" className="btn btn-vol mt-5">
            <MapPin className="h-4 w-4" /> Profielen toevoegen
          </Link>
        </div>
      ) : !metData.length ? (
        <div className="kaart p-12 text-center text-sm text-muted">Nog geen meting. Klik op Eerste meting (±$0,03 per vestiging bij DataForSEO).</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tegel label="Profielen" value={lijst.length} stip="accent" />
            <Tegel label="Gemiddelde score" value={gem ?? "–"} sub="van 100" stip={gem === null ? undefined : gem >= 75 ? "ok" : gem >= 50 ? "warn" : "bad"} />
            <Tegel label="Kansen" value={aantalKansen} sub="concrete acties, zie per vestiging" stip="warn" />
            <Tegel label="Kosten meting" value={`$${analyse!.kosten.toFixed(2)}`} sub="DataForSEO" />
          </div>
          <div className="lbl mt-2 !text-[9.5px]">
            Meting van {new Date(analyse!.gemaakt).toLocaleString("nl-NL")}
            {aantalProfielen !== lijst.length && " · het aantal profielen is veranderd; meet opnieuw"}
          </div>

          <div className="kaart mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left">
                  {["Vestiging", "Score", "Sterren", "Reviews", "Foto's", "Beschrijving", "Maps"].map((h) => (
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
                        setDicht((x) => {
                          const n = new Set(x);
                          n.delete(p.profiel_id);
                          return n;
                        });
                        document.getElementById(`profiel-${p.profiel_id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="cursor-pointer border-t border-line hover:bg-surface-2/40"
                    >
                      <td className="px-4 py-2.5 font-medium">{p.data?.naam ?? p.naam}</td>
                      <td className={`mono px-4 py-2.5 font-bold ${p.data ? scoreKleur(p.score) : "text-muted"}`}>{p.data ? p.score : "–"}</td>
                      <td className="px-4 py-2.5">{p.data?.sterren?.toFixed(1) ?? "–"}</td>
                      <td className="px-4 py-2.5">{p.data?.reviews ?? "–"}</td>
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
                <Kaart analyseId={analyseId} p={p} open={!dicht.has(p.profiel_id)} wissel={() => wissel(p.profiel_id)} suggesties={suggesties} stand={stand} onStand={setStand} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
