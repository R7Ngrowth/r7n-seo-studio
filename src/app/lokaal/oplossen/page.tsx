import { lokaalAnalyse, profielen, suggestieStand } from "@/lib/opslag";
import { suggesties } from "@/lib/lokaal-oplossen";
import { SuggestiesView } from "./SuggestiesView";

export default async function Oplossen() {
  const [a, lijst, stand] = await Promise.all([lokaalAnalyse(), profielen(), suggestieStand()]);
  return (
    <SuggestiesView
      lijst={a ? suggesties(a, lijst) : []}
      begin={stand}
      vestigingen={lijst.map((v) => ({ id: v.id, naam: v.naam, cid: v.cid }))}
      heeftAnalyse={!!a}
      metTeksten={!!a?.profielen.some((p) => p.teksten)}
    />
  );
}
