import { Hero } from "@/components/ui";
import { vereisSetup } from "@/lib/vereist";
import { Schrijven } from "./Schrijven";

export default async function Nieuw() {
  await vereisSetup();
  return (
    <>
      <Hero nummer="III" label="Nieuwe blog" title="Nieuwe blog" lines={["Geef een onderwerp, of laat de studio met ideeën komen.", "Tip: blogs vanuit Kansen krijgen een brief met zoekwoord en opbouw mee."]} />
      <Schrijven />
    </>
  );
}
