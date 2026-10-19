import { Hero } from "@/components/ui";
import { vereisSetup } from "@/lib/vereist";
import { Formulier } from "./Formulier";

export default async function Instellingen() {
  const i = await vereisSetup();
  // Sleutels en wachtwoorden gaan niet naar de browser; alleen of ze er zijn.
  const veilig = {
    profiel: i.profiel,
    ai: { ...i.ai, sleutel: "" },
    dfs: { login: i.dfs.login, wachtwoord: "" },
    koppeling: { ...i.koppeling, wpWachtwoord: "", shopToken: "", apiSleutel: "" },
    opmaak: i.opmaak,
  };
  const heeft = { ai: !!i.ai.sleutel, dfs: !!i.dfs.wachtwoord, wp: !!i.koppeling.wpWachtwoord, shop: !!i.koppeling.shopToken, api: !!i.koppeling.apiSleutel };
  return (
    <>
      <Hero nummer="VII" label="Instellingen" title="Instellingen" lines={["Alles staat op deze computer, in de map data/. Sleutels en wachtwoorden worden nooit gedeeld."]} />
      <Formulier begin={veilig} heeft={heeft} />
    </>
  );
}
