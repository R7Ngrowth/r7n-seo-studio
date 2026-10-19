import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { datum } from "@/components/BlogKaart";
import { Empty, Hero, Panel, Sectie } from "@/components/ui";
import { blogs } from "@/lib/opslag";
import { vereisSetup } from "@/lib/vereist";
import { bijwerkenGepland } from "@/lib/werk";

// Weeknummer volgens ISO, voor het groeperen van de planning.
function week(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  const begin = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `Week ${Math.ceil(((t.getTime() - begin.getTime()) / 86400000 + 1) / 7)}`;
}

export default async function Planning() {
  await vereisSetup();
  await bijwerkenGepland();
  const alle = await blogs();
  const gepland = alle.filter((b) => b.status === "gepland" && b.geplandVoor).sort((a, b) => a.geplandVoor!.localeCompare(b.geplandVoor!));
  const klaar = alle.filter((b) => b.status === "concept");
  const perWeek = new Map<string, typeof gepland>();
  for (const b of gepland) {
    const w = week(new Date(b.geplandVoor!));
    perWeek.set(w, [...(perWeek.get(w) ?? []), b]);
  }

  return (
    <>
      <Hero nummer="V" label="Planning" title="Planning" lines={["Ingeplande blogs staan al op je site en gaan op hun moment vanzelf live. Je computer hoeft niet aan te staan."]} />
      {gepland.length === 0 ? (
        <Panel>
          <Empty>Nog niets ingepland. Open een concept en kies Inplannen. Tip: één tot twee blogs per week werkt beter dan alles tegelijk.</Empty>
        </Panel>
      ) : (
        <div className="space-y-5">
          {[...perWeek].map(([w, lijst]) => (
            <section key={w}>
              <div className="lbl mb-2 !text-[9.5px]">{w}</div>
              <ul className="kaart divide-y divide-line">
                {lijst.map((b) => (
                  <li key={b.id}>
                    <Link href={`/blog/${b.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface2/40">
                      <CalendarClock className="h-4 w-4 shrink-0 text-accent" />
                      <span className="mono w-40 shrink-0 text-xs text-muted">{datum(b.geplandVoor)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{b.titel}</span>
                      <span className="hidden text-xs text-muted sm:inline">{b.categorie}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <Sectie nummer="VI" titel="Klaar om in te plannen" sub={`${klaar.length}`} />
      {klaar.length ? (
        <ul className="kaart divide-y divide-line">
          {klaar.map((b) => (
            <li key={b.id}>
              <Link href={`/blog/${b.id}`} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface2/40">
                <span className="min-w-0 truncate">{b.titel || b.onderwerp}</span>
                <span className="text-xs text-accent">Plan in →</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Panel>
          <Empty>Geen concepten die wachten.</Empty>
        </Panel>
      )}
    </>
  );
}
