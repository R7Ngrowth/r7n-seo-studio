import { lokaalAnalyse, instellingen, profielen } from "@/lib/opslag";
import { dfsSaldo, heeftDfs } from "@/lib/zoekwoorden";
import Link from "next/link";
import { DataForSeoUitleg } from "@/components/Uitleg";
import { LokaalView } from "./LokaalView";

export default async function Lokaal() {
  const i = await instellingen();
  const [lijst, analyse] = await Promise.all([profielen(), lokaalAnalyse()]);
  let dfs = { werkt: false, melding: "niet gekoppeld (Instellingen)" };
  if (heeftDfs(i.dfs)) {
    const saldo = await dfsSaldo(i.dfs).catch(() => undefined);
    dfs = saldo === undefined ? { werkt: false, melding: "inlog werkt niet (Instellingen)" } : { werkt: true, melding: saldo === null ? "gekoppeld" : `tegoed $${saldo.toFixed(2)}` };
  }
  return (
    <>
      {!dfs.werkt && (
        <div className="melding melding-geel mb-5 px-4 py-3 text-sm text-warn">
          <strong>Lokaal heeft DataForSEO nodig.</strong> Alle data over je bedrijfsprofiel (positie in Google Maps, concurrenten, reviews) komt daarvandaan. Vul je
          API-login en API-wachtwoord in bij{" "}
          <Link href="/instellingen" className="underline">
            Instellingen
          </Link>{" "}
          en zorg dat er tegoed op je account staat (opwaarderen via Billing, minimaal $50).
          <DataForSeoUitleg />
        </div>
      )}
      <LokaalView begin={analyse} aantalProfielen={lijst.length} dfs={dfs} ai={!!i.ai.sleutel} fout={null} />
    </>
  );
}
