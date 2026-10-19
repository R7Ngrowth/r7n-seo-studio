import Link from "next/link";
import { PenLine } from "lucide-react";
import { BlogKaart } from "@/components/BlogKaart";
import { Empty, Hero, Panel } from "@/components/ui";
import { blogs } from "@/lib/opslag";
import { vereisSetup } from "@/lib/vereist";

export default async function Concepten() {
  await vereisSetup();
  const lijst = (await blogs()).filter((b) => b.status === "concept" || b.status === "mislukt");
  return (
    <>
      <Hero
        nummer="IV"
        label="Concepten"
        title="Concepten"
        lines={["Geschreven en klaar om na te lezen. Open er een om aan te passen, in te plannen of live te zetten."]}
        right={
          <Link href="/nieuw" className="btn btn-vol">
            <PenLine className="h-4 w-4" /> Nieuwe blog
          </Link>
        }
      />
      {lijst.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lijst.map((b) => (
            <BlogKaart key={b.id} b={b} />
          ))}
        </div>
      ) : (
        <Panel>
          <Empty>Geen concepten. Laat er een schrijven via Kansen of Nieuwe blog.</Empty>
        </Panel>
      )}
    </>
  );
}
