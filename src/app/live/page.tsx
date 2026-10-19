import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { datum } from "@/components/BlogKaart";
import { Empty, Hero, Panel } from "@/components/ui";
import { blogs } from "@/lib/opslag";
import { vereisSetup } from "@/lib/vereist";
import { bijwerkenGepland } from "@/lib/werk";

export default async function Live() {
  const i = await vereisSetup();
  await bijwerkenGepland();
  const lijst = (await blogs()).filter((b) => b.status === "live").sort((a, b) => (b.liveOp ?? "").localeCompare(a.liveOp ?? ""));
  return (
    <>
      <Hero nummer="VI" label="Live" title="Live" lines={[`Deze blogs staan via de studio op ${i.profiel.website.replace(/^https?:\/\//, "")}.`]} right={<div className="mono text-5xl font-bold">{lijst.length}</div>} />
      {lijst.length ? (
        <ul className="kaart divide-y divide-line">
          {lijst.map((b) => (
            <li key={b.id} className="flex items-center gap-4 px-4 py-3">
              {b.beeld && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/beeld/${b.beeld}`} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
              )}
              <Link href={`/blog/${b.id}`} className="min-w-0 flex-1 hover:text-accent">
                <div className="truncate font-medium">{b.titel}</div>
                <div className="mono text-[11px] text-muted">live sinds {datum(b.liveOp)}</div>
              </Link>
              {b.liveUrl && (
                <a href={b.liveUrl} target="_blank" rel="noreferrer" className="btn">
                  Bekijk <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Panel>
          <Empty>Nog niets live. Zet je eerste blog live vanuit Concepten.</Empty>
        </Panel>
      )}
    </>
  );
}
