"use client";

import { Check, Loader2, MapPin, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Vestiging as Profiel, Zoekresultaat } from "@/lib/lokaal";
import { verwijder, voegToe, werkBij, zoek } from "../acties";

const standaardWoorden = (r: Zoekresultaat) => [...new Set([r.categorie, ...r.extra].map((c) => c.toLowerCase().trim()).filter(Boolean))].slice(0, 3);
const alsLijst = (t: string) => t.split(",").map((w) => w.trim()).filter(Boolean);

function Velden({ pagina, setPagina, woorden, setWoorden }: { pagina: string; setPagina: (v: string) => void; woorden: string; setWoorden: (v: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="lbl !text-[9.5px]">Vestigingspagina op de site</span>
        <input value={pagina} onChange={(e) => setPagina(e.target.value)} placeholder="https://www.jouwsite.nl/vestigingen/plaats/" className="veld mt-1.5" />
        <span className="mt-1 block text-[11px] text-muted">Voor de check op telefoon en openingstijden, en of het profiel naar deze pagina linkt.</span>
      </label>
      <label className="block">
        <span className="lbl !text-[9.5px]">Lokale zoekwoorden (met komma)</span>
        <input value={woorden} onChange={(e) => setWoorden(e.target.value)} placeholder="bakker, banketbakker" className="veld mt-1.5" />
        <span className="mt-1 block text-[11px] text-muted">Zonder plaatsnaam: de studio zoekt vanaf punten rond de winkel. Max. 5; elk woord kost ±$0,008 per meting.</span>
      </label>
    </div>
  );
}

export function ProfielenView({ begin }: { begin: Profiel[] }) {
  const router = useRouter();
  const [vraag, setVraag] = useState("");
  const [resultaten, setResultaten] = useState<Zoekresultaat[] | null>(null);
  const [gekozen, setGekozen] = useState<Zoekresultaat | null>(null);
  const [pagina, setPagina] = useState("");
  const [woorden, setWoorden] = useState("");
  const [bewerk, setBewerk] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const bekend = new Set(begin.map((p) => p.cid));

  async function zoeken(e: React.FormEvent) {
    e.preventDefault();
    setBezig("zoek");
    setFout(null);
    setGekozen(null);
    const r = await zoek(vraag);
    setBezig(null);
    if (r.ok) setResultaten(r.data);
    else setFout(r.fout);
  }

  function kies(r: Zoekresultaat) {
    setGekozen(r);
    setPagina("");
    setWoorden(standaardWoorden(r).join(", "));
  }

  async function toevoegen() {
    if (!gekozen) return;
    setBezig("toevoegen");
    setFout(null);
    const r = await voegToe(gekozen, pagina, alsLijst(woorden));
    setBezig(null);
    if (!r.ok) return setFout(r.fout);
    setGekozen(null);
    setResultaten(null);
    setVraag("");
    router.refresh();
  }

  function startBewerk(p: Profiel) {
    setBewerk(p.id);
    setPagina(p.pagina_url);
    setWoorden(p.zoekwoorden.join(", "));
  }

  async function opslaan(id: string) {
    setBezig(id);
    setFout(null);
    const r = await werkBij(id, pagina, alsLijst(woorden));
    setBezig(null);
    if (!r.ok) return setFout(r.fout);
    setBewerk(null);
    router.refresh();
  }

  async function weg(p: Profiel) {
    if (!confirm(`${p.naam} verwijderen uit de lijst? Het profiel bij Google blijft gewoon bestaan.`)) return;
    setBezig(p.id);
    const r = await verwijder(p.id);
    setBezig(null);
    if (!r.ok) return setFout(r.fout);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {fout && <div className="melding melding-rood px-4 py-3 text-sm text-bad">{fout}</div>}

      <section className="kaart p-5">
        <h2 className="kop !text-base">Bedrijfsprofiel toevoegen</h2>
        <p className="mt-1 text-sm text-muted">Typ de naam en de plaats, zoals je het in Google Maps zou zoeken. Elke vestiging is een eigen profiel.</p>
        <form onSubmit={zoeken} className="mt-4 flex flex-wrap gap-2.5">
          <input value={vraag} onChange={(e) => setVraag(e.target.value)} placeholder="Bakkerij De Molen Haarlem" className="veld min-w-0 flex-1" />
          <button className="btn btn-vol" disabled={bezig === "zoek"}>
            {bezig === "zoek" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Zoek in Google
          </button>
        </form>

        {resultaten && !gekozen && (
          <div className="mt-4 space-y-2">
            {resultaten.length === 0 && <p className="text-sm text-muted">Niets gevonden. Probeer een andere schrijfwijze of voeg de straat toe.</p>}
            {resultaten.map((r) => (
              <div key={r.cid} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.naam}</div>
                  <div className="text-xs text-muted">
                    {r.adres} · {r.categorie}
                    {r.sterren !== null && (
                      <>
                        {" "}· <Star className="inline h-3 w-3 -translate-y-px fill-current text-warn" /> {r.sterren.toFixed(1)} ({r.reviews})
                      </>
                    )}
                  </div>
                </div>
                {bekend.has(r.cid) ? (
                  <span className="lbl !text-[9.5px]">staat er al bij</span>
                ) : (
                  <button onClick={() => kies(r)} className="btn">
                    <Plus className="h-4 w-4" /> Kies
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {gekozen && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{gekozen.naam}</div>
                <div className="text-xs text-muted">{gekozen.adres}</div>
              </div>
              <button onClick={() => setGekozen(null)} className="btn-stil" aria-label="Annuleren">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Velden pagina={pagina} setPagina={setPagina} woorden={woorden} setWoorden={setWoorden} />
            <div className="mt-4 flex justify-end">
              <button onClick={toevoegen} disabled={bezig === "toevoegen"} className="btn btn-vol">
                {bezig === "toevoegen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Toevoegen
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="lbl mb-3">Jouw profielen ({begin.length})</div>
        {begin.length === 0 ? (
          <div className="kaart p-8 text-center text-sm text-muted">Nog geen profielen. Zoek hierboven het eerste profiel op.</div>
        ) : (
          <div className="space-y-2.5">
            {begin.map((p) => (
              <div key={p.id} className="kaart p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.naam}</div>
                    <div className="text-xs text-muted">{p.adres}</div>
                    {bewerk !== p.id && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span>
                          Pagina: {p.pagina_url ? <a href={p.pagina_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{p.pagina_url.replace(/^https?:\/\/(www\.)?/, "")}</a> : <em>niet ingevuld</em>}
                        </span>
                        <span>Zoekwoorden: {p.zoekwoorden.length ? p.zoekwoorden.join(", ") : <em>geen (geen Maps-meting)</em>}</span>
                      </div>
                    )}
                  </div>
                  {bewerk !== p.id && (
                    <div className="flex gap-1.5">
                      <button onClick={() => startBewerk(p)} className="btn" aria-label="Bewerken">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => weg(p)} disabled={bezig === p.id} className="btn" aria-label="Verwijderen">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {bewerk === p.id && (
                  <div className="mt-4">
                    <Velden pagina={pagina} setPagina={setPagina} woorden={woorden} setWoorden={setWoorden} />
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => setBewerk(null)} className="btn">
                        Annuleren
                      </button>
                      <button onClick={() => opslaan(p.id)} disabled={bezig === p.id} className="btn btn-vol">
                        {bezig === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Opslaan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
