"use client";

import { ArrowRight, ChevronDown, ExternalLink, Package, Radar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bezig } from "@/components/Bezig";
import { Tegel } from "@/components/ui";
import type { Bedoeling, Gat, Kans, Kansenrapport } from "@/lib/types";
import { analyseer, bewaarAanbod, schrijfBlog } from "../acties";

const GAT: Record<Gat, [string, string]> = {
  nieuw: ["nog niet op je site", "text-accent"],
  aanvullen: ["kort genoemd", "text-warn"],
  gedekt: ["staat er al", "text-muted"],
};
const BEDOELING: Record<Bedoeling, string> = { weten: "wil iets weten", vergelijken: "vergelijkt opties", kopen: "wil kiezen of kopen", vinden: "zoekt een site" };

function Ring({ waarde }: { waarde: number }) {
  const kleur = waarde >= 60 ? "var(--ok)" : waarde >= 40 ? "var(--warn)" : "var(--muted)";
  return (
    <div className="relative h-12 w-12 shrink-0" title="Kansscore 0-100">
      <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={kleur} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(waarde / 100) * 97.4} 97.4`} />
      </svg>
      <span className="mono absolute inset-0 flex items-center justify-center text-[13px] font-semibold">{waarde}</span>
    </div>
  );
}

// Welke productgroepen zijn onderzocht, met hoeveel zoekwoorden en kansen, en het veld om zelf groepen toe te voegen.
function Aanbod({ r, aanbod, setAanbod, onStart, bezig }: { r: Kansenrapport | null; aanbod: string; setAanbod: (v: string) => void; onStart: () => void; bezig: boolean }) {
  const [tekst, setTekst] = useState(aanbod);
  const [stand, setStand] = useState<"idle" | "bezig" | "klaar" | "fout">("idle");
  const [fout, setFout] = useState<string | null>(null);
  const anders = tekst.trim() !== aanbod.trim();
  async function opslaan() {
    setStand("bezig");
    setFout(null);
    const u = await bewaarAanbod(tekst);
    if (u.ok) {
      setAanbod(u.data);
      setTekst(u.data);
      setStand("klaar");
    } else {
      setStand("fout");
      setFout(u.fout);
    }
  }
  const groepen = r?.groepen ?? [];
  return (
    <div className="kaart mt-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="lbl flex items-center gap-1.5 !text-[9.5px]">
          <Package className="h-3.5 w-3.5" /> Onderzochte productgroepen en diensten
        </div>
        {r?.kosten ? <span className="mono text-[11px] text-muted">DataForSEO ${r.kosten.toFixed(2)}</span> : null}
      </div>
      {groepen.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {groepen.map((g) => {
            const weinig = g.zoekwoorden === 0 || (g.volume !== null && g.volume < 50);
            return (
              <li
                key={g.term}
                title={`${g.zoekwoorden} zoekwoorden gevonden${g.volume !== null ? `, samen ${g.volume.toLocaleString("nl-NL")} zoekopdrachten per maand` : ""}${g.eigen ? " · door jou toegevoegd" : ""}`}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${g.kansen ? "border-line text-text" : "border-dashed border-line text-muted"}`}
              >
                <span>{g.naam}</span>
                <span className="mono text-[10.5px] text-muted">
                  {g.kansen} {g.kansen === 1 ? "kans" : "kansen"}
                  {weinig ? " · weinig zoekvraag" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">Na de analyse zie je hier per productgroep hoeveel zoekwoorden en kansen er gevonden zijn.</p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="text-[12px] text-muted">
            Ontbreekt er iets wat je verkoopt of doet? Zet het hier (met komma); de volgende analyse onderzoekt elke groep apart, ook als het nog niet op je site staat.
          </span>
          <input value={tekst} onChange={(e) => { setTekst(e.target.value); setStand("idle"); }} placeholder="bakfiets, e-bike, fatbike, kinderfiets, werkplaats" className="veld mt-1.5" />
        </label>
        <div className="flex items-end gap-2">
          <button onClick={opslaan} disabled={!anders || stand === "bezig"} className="btn">
            {stand === "bezig" ? "Opslaan…" : "Bewaar"}
          </button>
          {r && (
            <button onClick={onStart} disabled={anders || bezig} className="btn btn-vol" title={anders ? "Bewaar eerst je aanbod" : "Nieuwe analyse met dit aanbod"}>
              <Radar className="h-4 w-4" /> Analyseer opnieuw
            </button>
          )}
        </div>
      </div>
      {stand === "klaar" && <p className="mt-2 text-xs text-ok">Bewaard. Klik op Analyseer opnieuw om de nieuwe groepen te onderzoeken.</p>}
      {fout && <p className="mt-2 text-xs text-bad">{fout}</p>}
    </div>
  );
}

export function KansenBord({ begin, metCijfers, aanbod: beginAanbod }: { begin: Kansenrapport | null; metCijfers: boolean; aanbod: string }) {
  const router = useRouter();
  const [r, setR] = useState(begin);
  const [aanbod, setAanbod] = useState(beginAanbod);
  const [thema, setThema] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [bezig, setBezig] = useState<"analyse" | "schrijven" | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function start() {
    setBezig("analyse");
    setFout(null);
    const u = await analyseer();
    setBezig(null);
    if (u.ok) {
      setR(u.data);
      setThema(null);
    } else setFout(u.fout);
  }
  async function schrijf(k: Kans) {
    setBezig("schrijven");
    setFout(null);
    const u = await schrijfBlog(k.zoekwoord, k.id);
    if (u.ok) router.push(`/blog/${u.data}`);
    else {
      setBezig(null);
      setFout(u.fout);
    }
  }

  if (bezig === "analyse")
    return (
      <Bezig
        titel="Je markt wordt onderzocht"
        seconden={150}
        stappen={["Je website lezen", "Productgroepen en zoektermen van je klanten bepalen", metCijfers ? "Per productgroep zoekvolumes ophalen bij DataForSEO" : "Google-suggesties verzamelen", "Thema's en gaten in je site vinden", "Kansen scoren en briefs schrijven"]}
      />
    );
  if (bezig === "schrijven")
    return (
      <Bezig
        titel="Je blog wordt geschreven"
        seconden={150}
        stappen={["Brief en bestaande pagina's erbij pakken", "Artikel schrijven in jouw stem", "Titel, meta en interne links", "Afbeelding maken met OpenAI", "Concept klaarzetten"]}
      />
    );

  const lijst = (r?.kansen ?? []).filter((k) => !thema || k.thema === thema);

  return (
    <>
      {fout && <div className="melding melding-rood mb-4 px-4 py-3 text-sm text-bad">{fout}</div>}
      {!metCijfers && (
        <div className="melding melding-geel mb-4 px-4 py-3 text-sm text-warn">
          <strong>Zonder zoekvolumes.</strong> De studio ziet nu wél waar mensen op zoeken (Google-suggesties), maar niet hoe vaak. Met DataForSEO krijg je per
          zoekwoord het aantal zoekopdrachten per maand en hoe moeilijk het is om bovenaan te komen, zodat je schrijft over wat echt bezoekers oplevert. Optioneel;
          koppelen bij{" "}
          <Link href="/instellingen" className="underline">
            Instellingen
          </Link>
          .
        </div>
      )}
      {!r ? (
        <div className="kaart p-10 text-center">
          <Radar className="mx-auto h-10 w-10 text-accent" />
          <h2 className="titel mt-4 text-3xl">Nog geen analyse</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">De studio leest je site, zoekt uit waar je klanten op zoeken en laat zien welke blogs het meeste opleveren. Duurt 2 à 3 minuten.</p>
          <button onClick={start} className="btn btn-vol mt-6">
            <Radar className="h-4 w-4" /> Start de analyse
          </button>
          <div className="mx-auto mt-6 max-w-2xl text-left">
            <Aanbod r={null} aanbod={aanbod} setAanbod={setAanbod} onStart={start} bezig={!!bezig} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tegel label="Kansen" value={r.kansen.length} stip="accent" />
            <Tegel label="Nog niet op je site" value={r.kansen.filter((k) => k.gat === "nieuw").length} />
            <Tegel label="Zoekwoorden bekeken" value={r.zoekwoorden} />
            <Tegel label="Pagina's gelezen" value={r.paginas} sub={r.bron === "dataforseo" ? "met zoekvolumes" : "zonder zoekvolumes"} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="lbl !text-[9.5px]">Analyse van {new Date(r.gemaakt).toLocaleString("nl-NL")}</span>
            <button onClick={start} className="btn">
              <Radar className="h-4 w-4" /> Nieuwe analyse
            </button>
          </div>
          {r.melding && <div className="melding melding-geel mt-3 px-4 py-3 text-sm text-warn">{r.melding}</div>}
          <Aanbod r={r} aanbod={aanbod} setAanbod={setAanbod} onStart={start} bezig={!!bezig} />

          <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-1">
              <div className="lbl mb-2 !text-[9.5px]">Thema&apos;s</div>
              {[{ naam: null as string | null, uitleg: "" }, ...r.themas].map((t) => {
                const n = t.naam ? r.kansen.filter((k) => k.thema === t.naam).length : r.kansen.length;
                if (!n) return null;
                return (
                  <button
                    key={t.naam ?? "alle"}
                    onClick={() => setThema(t.naam)}
                    title={t.uitleg}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                      thema === t.naam ? "bg-accent/12 text-text" : "text-muted hover:bg-surface2/60 hover:text-text"
                    }`}
                  >
                    <span className="truncate">{t.naam ?? "Alle kansen"}</span>
                    <span className="mono text-[11px]">{n}</span>
                  </button>
                );
              })}
            </aside>

            <ul className="kaart divide-y divide-line">
              {lijst.map((k) => {
                const uit = open === k.id;
                return (
                  <li key={k.id}>
                    <button onClick={() => setOpen(uit ? null : k.id)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface2/40">
                      <Ring waarde={k.score} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{k.titelIdee}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                          <span className="mono text-text">{k.zoekwoord}</span>
                          {k.volume !== null && <span>{k.volume.toLocaleString("nl-NL")} zoekopdrachten/mnd</span>}
                          {k.moeilijkheid !== null && <span>moeilijkheid {k.moeilijkheid}</span>}
                          <span className={GAT[k.gat][1]}>{GAT[k.gat][0]}</span>
                        </div>
                      </div>
                      {k.blogId ? <span className="lbl !text-[9.5px] !text-ok">geschreven</span> : null}
                      <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${uit ? "rotate-180" : ""}`} />
                    </button>
                    {uit && (
                      <div className="grid gap-5 border-t border-line bg-surface2/30 px-4 py-4 text-sm md:grid-cols-[1fr_auto]">
                        <div className="space-y-2">
                          <p>
                            <span className="lbl mr-2 !text-[9.5px]">Waarom</span>
                            {k.waarom}
                          </p>
                          <p>
                            <span className="lbl mr-2 !text-[9.5px]">Invalshoek</span>
                            {k.invalshoek}
                          </p>
                          <p className="text-muted">
                            <span className="lbl mr-2 !text-[9.5px]">De zoeker</span>
                            {BEDOELING[k.bedoeling]}
                          </p>
                          {k.opbouw.length > 0 && (
                            <ol className="ml-4 list-decimal text-muted">
                              {k.opbouw.map((o) => (
                                <li key={o}>{o}</li>
                              ))}
                            </ol>
                          )}
                          {k.bestaandePagina && (
                            <a href={k.bestaandePagina} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                              Pagina die het al behandelt <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div>
                          {k.blogId ? (
                            <Link href={`/blog/${k.blogId}`} className="btn">
                              Open blog <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <button onClick={() => schrijf(k)} className="btn btn-vol">
                              Schrijf deze blog <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
