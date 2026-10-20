"use client";

import { Camera, Check, CheckCircle2, ExternalLink, Lightbulb, Loader2, MapPin, Radar, Send, Store, Undo2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bezig } from "@/components/Bezig";
import type { Check as CheckT, LokaalAnalyse, ProfielAnalyse } from "@/lib/lokaal";
import type { Suggestie } from "@/lib/lokaal-oplossen";
import type { SuggestieStand } from "@/lib/opslag";
import { analyseer, markeerSuggestie } from "./acties";

// Per vestiging: waar de kans ligt en wat er moet gebeuren, met de tekst om te kopiëren. Je voert het zelf door in je profiel op Google.
const NIET_TONEN = new Set(["reacties", "sterren", "recent", "maps"]); // reviews beantwoorden spreekt voor zich; Maps is het gevolg
const WINKEL = new Set(["fotos", "aantal_reviews"]);
const kleur = (s: number) => (s >= 75 ? "text-ok" : s >= 50 ? "text-warn" : "text-bad");

function Kopieer({ tekst }: { tekst: string }) {
  const [klaar, setKlaar] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(tekst);
        setKlaar(true);
        setTimeout(() => setKlaar(false), 1500);
      }}
      className="btn !px-2.5 !py-1.5 text-xs"
    >
      {klaar ? <Check className="h-3.5 w-3.5 text-ok" /> : null} {klaar ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}

function regel(c: CheckT, s?: Suggestie): string {
  if (c.id === "beschrijving") return "Vervang de beschrijving in je profiel door de nieuwe tekst";
  if (c.id === "extra_cat") return s ? `Voeg ${s.tekst.split("\n").length === 1 ? "de categorie" : "de categorieën"} ${s.tekst.split("\n").join(", ")} toe` : "Voeg extra categorieën toe die bij je diensten passen";
  if (c.id === "link") return "Laat de website-link naar je eigen vestigingspagina wijzen";
  if (c.id === "aantal_reviews") return `Vraag klanten na een aankoop om een review (${c.uitleg.replace(/\s*\(concurrenten ±(\d+)\)/, " tegenover ±$1 bij concurrenten")})`;
  return c.actie || c.uitleg;
}

function kansZin(p: ProfielAnalyse): string {
  const pos = p.metingen.length ? p.metingen.reduce((t, m) => t + (m.positie ?? 21), 0) / p.metingen.length : null;
  const maps = pos === null ? "" : `In Google Maps sta je vanaf ±2 km gemiddeld op plek ${(Math.round(pos * 10) / 10).toLocaleString("nl-NL")}. `;
  const top = p.checks.filter((c) => c.ok === false && !NIET_TONEN.has(c.id)).sort((a, b) => b.gewicht - b.punten - (a.gewicht - a.punten))[0];
  if (!top) return `${maps}De basis staat goed; houd je profiel actief met een wekelijks bericht.`;
  const winst: Record<string, string> = {
    aantal_reviews: "meer reviews: concurrenten boven je hebben er veel meer",
    beschrijving: "een volledige beschrijving, zodat Google beter snapt wat je doet",
    extra_cat: "extra categorieën, zodat je bij meer zoekopdrachten verschijnt",
    link: "de website-link naar je eigen pagina",
    fotos: "meer echte foto's",
    uren: "openingstijden die overal gelijk zijn",
  };
  return `${maps}De grootste winst zit in ${winst[top.id] ?? top.label.toLowerCase()}.`;
}

function Kaart({ p, suggesties, stand, onStand }: { p: ProfielAnalyse; suggesties: Suggestie[]; stand: SuggestieStand; onStand: (s: SuggestieStand) => void }) {
  const [bezig, setBezig] = useState<string | null>(null);
  const status = (s: Suggestie) => stand[s.id]?.status ?? "open";
  const tekst = (s: Suggestie) => stand[s.id]?.tekst ?? s.tekst;
  const bij = (id: string) => suggesties.find((s) => s.soort === (id === "extra_cat" ? "categorieen" : id));
  const todo = p.checks
    .filter((c) => c.ok === false && !NIET_TONEN.has(c.id))
    .filter((c) => {
      const s = bij(c.id);
      return !s || status(s) === "open";
    })
    .sort((a, b) => b.gewicht - b.punten - (a.gewicht - a.punten))
    .slice(0, 5);
  const bericht = suggesties.find((s) => s.soort === "bericht" && status(s) === "open");

  async function zet(id: string, w: { status: "open" | "gedaan" }) {
    setBezig(id);
    const r = await markeerSuggestie(id, w);
    setBezig(null);
    if (r.ok) onStand(r.data);
  }

  return (
    <section className="kaart p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="kop !text-base">{p.data?.naam ?? p.naam}</h2>
          <a href={`https://www.google.com/maps?cid=${p.cid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent">
            Open profiel <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className={`mono text-2xl font-bold ${kleur(p.score)}`}>{p.score}</div>
      </div>
      <p className="mt-3 flex gap-2 text-sm">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" /> <span>{kansZin(p)}</span>
      </p>

      {todo.length > 0 && (
        <div className="mt-4">
          <div className="lbl mb-2 !text-[9.5px]">Wat moet er gebeuren</div>
          <ul className="space-y-2">
            {todo.map((c) => {
              const s = bij(c.id);
              const Icoon = WINKEL.has(c.id) ? (c.id === "fotos" ? Camera : Store) : User;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm">
                  <Icoon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    {regel(c, s)}
                    <span className="ml-2 text-xs text-ok">+{Math.round(c.gewicht - c.punten)}</span>
                  </span>
                  {s && <Kopieer tekst={tekst(s)} />}
                  {s && (
                    <button onClick={() => zet(s.id, { status: "gedaan" })} disabled={bezig !== null} className="btn !px-2.5 !py-1.5 text-xs">
                      {bezig === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Gedaan
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-line px-3 py-2.5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Send className="h-4 w-4 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">{bericht ? "Plaats deze week een Google-bericht (1 per week houdt je profiel actief)" : "Alle voorgestelde berichten zijn geplaatst. Meet opnieuw voor nieuwe."}</span>
          {bericht && <Kopieer tekst={tekst(bericht)} />}
          {bericht && (
            <button onClick={() => zet(bericht.id, { status: "gedaan" })} disabled={bezig !== null} className="btn !px-2.5 !py-1.5 text-xs">
              {bezig === bericht.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Geplaatst
            </button>
          )}
        </div>
        {bericht && <p className="mt-2 whitespace-pre-line text-xs text-muted">{tekst(bericht)}</p>}
      </div>

      {suggesties.some((s) => status(s) === "gedaan") && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-ok" /> {suggesties.filter((s) => status(s) === "gedaan").length} gedaan
          <button onClick={() => suggesties.filter((s) => status(s) === "gedaan").forEach((s) => zet(s.id, { status: "open" }))} className="btn-stil inline-flex items-center gap-1 !px-1 text-xs">
            <Undo2 className="h-3 w-3" /> terugzetten
          </button>
        </div>
      )}
    </section>
  );
}

export function SimpelView({
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

  const lijst = (analyse?.profielen ?? []).filter((p) => p.data);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Per vestiging: waar de kansen liggen en wat er moet gebeuren. Kopieer de tekst en plak hem in je profiel op Google; automatisch aanpassen kan alleen met een eigen
          Google Cloud-koppeling (Business Profile API).
          {analyse && ` Gemeten op ${new Date(analyse.gemaakt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}.`}
        </p>
        <button onClick={meting} disabled={!aantalProfielen || !dfs.werkt} className="btn btn-vol">
          <Radar className="h-4 w-4" /> {analyse ? "Nieuwe meting" : "Eerste meting"}
        </button>
      </div>
      <div className="lbl mb-4 flex items-center gap-2 !text-[9.5px]">
        <span className={`h-1.5 w-1.5 rounded-full ${dfs.werkt ? "bg-ok" : "bg-bad"}`} /> DataForSEO · {dfs.melding}
      </div>
      {fout && <div className="melding melding-rood mb-4 px-4 py-3 text-sm text-bad">{fout}</div>}

      {!aantalProfielen ? (
        <div className="kaart p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted" />
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">Nog geen bedrijfsprofielen. Voeg je vestigingen toe bij Profielen.</p>
          <Link href="/lokaal/profielen" className="btn btn-vol mt-5">
            <MapPin className="h-4 w-4" /> Profielen toevoegen
          </Link>
        </div>
      ) : !lijst.length ? (
        <div className="kaart p-12 text-center text-sm text-muted">Nog geen meting. Klik op Eerste meting (±$0,03 per vestiging bij DataForSEO).</div>
      ) : (
        <div className="space-y-4">
          {lijst.map((p) => (
            <Kaart key={p.profiel_id} p={p} suggesties={suggesties.filter((s) => s.profiel_id === p.profiel_id)} stand={stand} onStand={setStand} />
          ))}
        </div>
      )}
    </>
  );
}
