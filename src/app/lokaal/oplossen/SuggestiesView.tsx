"use client";

import { Check, Copy, ExternalLink, Info, Loader2, Pencil, SkipForward, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Tegel } from "@/components/ui";
import { SOORT_LABEL, type Suggestie, type SuggestieSoort } from "@/lib/lokaal-oplossen";
import type { SuggestieStand } from "@/lib/opslag";
import { markeerSuggestie } from "../acties";

const VOLGORDE: SuggestieSoort[] = ["beschrijving", "categorieen", "link", "review_antwoord", "bericht"];
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
      className="btn !px-2.5 !py-1.5 text-xs"
    >
      {klaar ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />} {klaar ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}

function Kaart({ s, cid, stand, onStand }: { s: Suggestie; cid: string; stand: SuggestieStand[string] | undefined; onStand: (n: SuggestieStand) => void }) {
  const status = stand?.status ?? "open";
  const tekst = stand?.tekst ?? s.tekst;
  const [bewerk, setBewerk] = useState(false);
  const [concept, setConcept] = useState(tekst);
  const [bezig, setBezig] = useState(false);
  const bewerkbaar = s.soort !== "categorieen";

  async function zet(w: { status?: "open" | "gedaan" | "overgeslagen"; tekst?: string }) {
    setBezig(true);
    const r = await markeerSuggestie(s.id, w);
    setBezig(false);
    if (r.ok) onStand(r.data);
  }

  return (
    <div className={`rounded-xl border border-line p-4 ${status !== "open" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{SOORT_LABEL[s.soort]}</span>
        {status === "gedaan" && <Chip klasse="border-ok/40 bg-ok/10 text-ok">Gedaan</Chip>}
        {status === "overgeslagen" && <Chip klasse="border-line bg-surface2 text-muted">Overgeslagen</Chip>}
        {s.week && <span className="text-xs text-muted">plaatsen: {s.week}</span>}
      </div>
      <div className="mt-2.5 space-y-2 text-sm">
        {s.review && <p className="line-clamp-3 text-xs italic text-muted">“{s.review}”</p>}
        {s.nu && (
          <p className="text-xs text-muted">
            <span className="lbl !text-[9px]">nu</span> {s.nu}
          </p>
        )}
        {bewerk ? (
          <textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows={s.soort === "link" ? 2 : 6} className="veld text-sm" />
        ) : s.soort === "categorieen" ? (
          <div className="flex flex-wrap gap-1.5">
            {tekst.split("\n").map((c) => (
              <span key={c} className="rounded-full border border-accent/40 px-2.5 py-0.5 text-xs">
                + {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-line rounded-lg bg-surface2/50 p-3 leading-relaxed">{tekst}</p>
        )}
        {s.soort === "categorieen" && <p className="text-xs text-muted">Gekozen uit de categorieën van de concurrenten boven je. Neem alleen over wat echt bij je bedrijf past.</p>}
        <p className="text-xs text-muted">
          <span className="lbl !text-[9px]">waar</span> {s.waar}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {bewerk ? (
          <>
            <button onClick={() => setBewerk(false)} className="btn !px-2.5 !py-1.5 text-xs">
              Annuleren
            </button>
            <button
              onClick={async () => {
                await zet({ tekst: concept });
                setBewerk(false);
              }}
              disabled={bezig}
              className="btn btn-vol !px-2.5 !py-1.5 text-xs"
            >
              {bezig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Bewaar
            </button>
          </>
        ) : status === "open" ? (
          <>
            {bewerkbaar && (
              <button onClick={() => setBewerk(true)} className="btn !px-2.5 !py-1.5 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Bewerk
              </button>
            )}
            <Kopieer tekst={tekst} />
            <a href={`https://www.google.com/maps?cid=${cid}`} target="_blank" rel="noreferrer" className="btn !px-2.5 !py-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Open profiel
            </a>
            <button onClick={() => zet({ status: "gedaan" })} disabled={bezig} className="btn !px-2.5 !py-1.5 text-xs">
              <Check className="h-3.5 w-3.5" /> Gedaan
            </button>
            <button onClick={() => zet({ status: "overgeslagen" })} disabled={bezig} className="btn-stil inline-flex items-center gap-1.5 !px-2.5 !py-1.5 text-xs">
              <SkipForward className="h-3.5 w-3.5" /> Overslaan
            </button>
          </>
        ) : (
          <button onClick={() => zet({ status: "open" })} disabled={bezig} className="btn-stil inline-flex items-center gap-1.5 !px-2.5 !py-1.5 text-xs">
            <Undo2 className="h-3.5 w-3.5" /> Terugzetten
          </button>
        )}
      </div>
    </div>
  );
}

export function SuggestiesView({
  lijst,
  begin,
  vestigingen,
  heeftAnalyse,
  metTeksten,
}: {
  lijst: Suggestie[];
  begin: SuggestieStand;
  vestigingen: { id: string; naam: string; cid: string }[];
  heeftAnalyse: boolean;
  metTeksten: boolean;
}) {
  const [stand, setStand] = useState(begin);
  const status = (s: Suggestie) => stand[s.id]?.status ?? "open";
  const open = lijst.filter((s) => status(s) === "open").length;
  const gedaan = lijst.filter((s) => status(s) === "gedaan").length;

  return (
    <>
      <div className="melding melding-normaal mb-5 flex gap-3 px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div>
          <strong className="text-text">Je voert deze verbeteringen zelf door.</strong> De studio zet per profiel alles klaar: de tekst, waar je het in je profiel aanpast
          en een knop om het profiel te openen. Log in op Google met het account dat beheerder is van je profiel, plak de tekst en vink hem af.
          <br />
          Automatisch doorvoeren kan niet zonder een eigen Google-koppeling: daarvoor heb je een Google Cloud-project nodig met goedgekeurde toegang tot de Google
          Business Profile API. Die koppeling zit (nog) niet in de studio.
        </div>
      </div>

      {!heeftAnalyse || !metTeksten ? (
        <div className="kaart p-12 text-center text-sm text-muted">
          {!heeftAnalyse ? "Analyseer eerst je bedrijfsprofielen bij " : "De laatste analyse heeft nog geen teksten. Vul je OpenRouter-sleutel in en analyseer opnieuw bij "}
          <Link href="/lokaal" className="text-accent underline">
            Lokaal → Analyse
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tegel label="Nog te doen" value={open} stip={open ? "warn" : "ok"} />
            <Tegel label="Gedaan" value={gedaan} stip="ok" />
            <Tegel label="Profielen" value={vestigingen.length} />
          </div>
          <div className="mt-5 space-y-6">
            {vestigingen.map((v) => {
              const eigen = lijst.filter((s) => s.profiel_id === v.id).sort((a, b) => VOLGORDE.indexOf(a.soort) - VOLGORDE.indexOf(b.soort));
              if (!eigen.length) return null;
              return (
                <section key={v.id} className="kaart p-5">
                  <h2 className="kop !text-base">{v.naam}</h2>
                  <div className="mt-4 space-y-3">
                    {eigen.map((s) => (
                      <Kaart key={s.id} s={s} cid={v.cid} stand={stand[s.id]} onStand={setStand} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
