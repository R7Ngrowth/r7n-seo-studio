import { lokaalAnalyse, instellingen, profielen } from "@/lib/opslag";
import { dfsSaldo, heeftDfs } from "@/lib/zoekwoorden";
import { LokaalView } from "./LokaalView";

export default async function Lokaal() {
  const i = await instellingen();
  const [lijst, analyse] = await Promise.all([profielen(), lokaalAnalyse()]);
  let dfs = { werkt: false, melding: "niet gekoppeld (Instellingen)" };
  if (heeftDfs(i.dfs)) {
    const saldo = await dfsSaldo(i.dfs).catch(() => undefined);
    dfs = saldo === undefined ? { werkt: false, melding: "inlog werkt niet (Instellingen)" } : { werkt: true, melding: saldo === null ? "gekoppeld" : `tegoed $${saldo.toFixed(2)}` };
  }
  return <LokaalView begin={analyse} aantalProfielen={lijst.length} dfs={dfs} ai={!!i.ai.sleutel} fout={null} />;
}
