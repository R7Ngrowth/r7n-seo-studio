import { Hero } from "@/components/ui";
import { kansenrapport } from "@/lib/opslag";
import { vereisSetup } from "@/lib/vereist";
import { heeftDfs } from "@/lib/zoekwoorden";
import { KansenBord } from "./KansenBord";

export default async function Kansen() {
  const i = await vereisSetup();
  return (
    <>
      <Hero nummer="II" label="Kansen" title="Kansen" lines={["Waar zoeken je klanten op, en wat mist er nog op je site?"]} />
      <KansenBord begin={await kansenrapport()} metCijfers={heeftDfs(i.dfs)} aanbod={i.profiel.aanbod ?? ""} />
    </>
  );
}
