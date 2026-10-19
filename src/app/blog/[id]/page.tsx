import { notFound } from "next/navigation";
import { blog } from "@/lib/opslag";
import { plek } from "@/lib/plek";
import { vereisSetup } from "@/lib/vereist";
import { adresVrij } from "@/lib/werk";
import { Editor } from "./Editor";

export default async function BlogPagina({ params }: PageProps<"/blog/[id]">) {
  const i = await vereisSetup();
  const b = await blog((await params).id);
  if (!b) notFound();
  const p = plek(i.koppeling);
  const [vrij, categorieen] = await Promise.all([b.status === "live" ? null : adresVrij(b), p ? p.categorieen().catch(() => []) : Promise.resolve([])]);
  return (
    <Editor
      begin={b}
      omgeving={{
        site: i.profiel.website,
        cms: i.koppeling.cms,
        automatisch: !!p,
        plugin: i.opmaak.plugin,
        adresVrij: vrij,
        categorieen,
      }}
    />
  );
}
