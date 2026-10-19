"use client";

import { Lightbulb, Loader2, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bezig } from "@/components/Bezig";
import { ideeen, schrijfBlog } from "../acties";

export function Schrijven() {
  const router = useRouter();
  const [onderwerp, setOnderwerp] = useState("");
  const [lijst, setLijst] = useState<string[]>([]);
  const [denkt, setDenkt] = useState(false);
  const [schrijft, setSchrijft] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function bedenk() {
    setDenkt(true);
    setFout(null);
    const r = await ideeen();
    setDenkt(false);
    if (r.ok) setLijst(r.data);
    else setFout(r.fout);
  }
  async function schrijf(o: string) {
    if (!o.trim()) return;
    setSchrijft(true);
    setFout(null);
    const r = await schrijfBlog(o);
    if (r.ok) router.push(`/blog/${r.data}`);
    else {
      setSchrijft(false);
      setFout(r.fout);
    }
  }

  if (schrijft)
    return <Bezig titel="Je blog wordt geschreven" seconden={150} stappen={["Je site en bestaande blogs bekijken", "Artikel schrijven in jouw stem", "Titel, meta en interne links", "Afbeelding maken met OpenAI", "Concept klaarzetten"]} />;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <section className="kaart p-6">
        <label className="lbl block !text-[9.5px]">
          Waar moet de blog over gaan?
          <textarea value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} rows={4} placeholder="Bijv. 'Hoe vaak moet je je e-bike laten onderhouden?' — hoe concreter, hoe beter" className="veld" />
        </label>
        <button onClick={() => schrijf(onderwerp)} disabled={!onderwerp.trim()} className="btn btn-vol mt-4">
          <PenLine className="h-4 w-4" /> Schrijf blog met afbeelding
        </button>
        {fout && <div className="melding melding-rood mt-4 px-4 py-3 text-sm text-bad">{fout}</div>}
      </section>
      <section className="kaart p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="kop">Geen inspiratie?</h2>
          <button onClick={bedenk} disabled={denkt} className="btn">
            {denkt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />} {denkt ? "Even denken…" : "Geef ideeën"}
          </button>
        </div>
        {lijst.length ? (
          <ul className="mt-4 space-y-2">
            {lijst.map((i) => (
              <li key={i}>
                <button onClick={() => schrijf(i)} className="rij w-full rounded-lg border border-line px-3 py-2.5 text-left text-sm">
                  {i}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">De studio bedenkt zes onderwerpen die passen bij je bedrijf en nog niet op je site staan. Klik er een aan om te laten schrijven.</p>
        )}
      </section>
    </div>
  );
}
