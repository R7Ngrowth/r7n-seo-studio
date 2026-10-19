import Link from "next/link";
import { PenLine, Radar } from "lucide-react";
import { Empty, Hero, Panel, Sectie, Tegel } from "@/components/ui";
import { blogs, kansenrapport, logboek } from "@/lib/opslag";
import { vereisSetup } from "@/lib/vereist";

const tijd = (iso: string) => new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function Overzicht() {
  const i = await vereisSetup();
  const [lijst, rapport, log] = await Promise.all([blogs(), kansenrapport(), logboek(8)]);
  const open = rapport?.kansen.filter((k) => !k.blogId && k.gat !== "gedekt").length ?? 0;

  return (
    <>
      <Hero
        nummer="I"
        label="SEO Studio"
        title={i.profiel.naam || "SEO Studio"}
        lines={[i.profiel.onderwerp || i.profiel.website]}
        right={
          <div className="flex gap-2">
            <Link href="/kansen" className="btn">
              <Radar className="h-4 w-4" /> Zoek kansen
            </Link>
            <Link href="/nieuw" className="btn btn-vol">
              <PenLine className="h-4 w-4" /> Nieuwe blog
            </Link>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tegel label="Open kansen" value={rapport ? open : "—"} sub={rapport ? `analyse van ${tijd(rapport.gemaakt)}` : "nog geen analyse"} stip="accent" />
        <Tegel label="Wacht op jou" value={lijst.filter((b) => b.status === "concept").length} sub="concepten" stip="warn" />
        <Tegel label="Ingepland" value={lijst.filter((b) => b.status === "gepland").length} sub="staan klaar op je site" />
        <Tegel label="Live" value={lijst.filter((b) => b.status === "live").length} sub="via de studio geplaatst" stip="ok" />
      </div>
      <Sectie nummer="II" titel="Wat er gebeurde" />
      <Panel>
        {log.length ? (
          <ul className="space-y-2.5 text-sm">
            {log.map((r, n) => (
              <li key={n} className="flex gap-3">
                <span className="mono w-28 shrink-0 text-xs text-muted">{tijd(r.tijd)}</span>
                <span className={r.soort === "fout" ? "text-bad" : ""}>{r.tekst}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nog niets gebeurd. Begin bij Kansen.</Empty>
        )}
      </Panel>
    </>
  );
}
