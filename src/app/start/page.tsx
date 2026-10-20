import { Merk } from "@/components/ui";
import { instellingen } from "@/lib/opslag";
import { Wizard } from "./Wizard";

// Analyseren van een site kan een minuut duren.
export const maxDuration = 300;

export default async function Start({ searchParams }: PageProps<"/start">) {
  const i = await instellingen();
  // Alleen tijdens ontwikkelen: direct naar een stap springen om de schermen te bekijken.
  const sp = await searchParams;
  const stap = process.env.NODE_ENV === "development" ? Math.min(4, Math.max(0, Number(sp.stap ?? 1) - 1)) : 0;
  return (
    <>
      <header className="mb-8 flex flex-col items-center text-center">
        <Merk size={64} gloed />
        <p className="lbl mt-5 !text-[10px]">R7N Growth</p>
        <h1 className="titel mt-2 text-[2.6rem]">SEO Studio</h1>
        <p className="mt-2 max-w-md text-sm text-muted">Zoek uit waar je klanten op zoeken, laat blogs schrijven in jouw stem en zet ze op je eigen website. In vijf stappen klaar.</p>
      </header>
      <Wizard begin={{ website: i.profiel.website, sleutelAanwezig: !!i.ai.sleutel, dfsAanwezig: !!(i.dfs.login && i.dfs.wachtwoord), stap }} />
      <p className="mt-6 text-center text-[11px] text-muted">Je gegevens en sleutels blijven op deze computer (map data/).</p>
    </>
  );
}
