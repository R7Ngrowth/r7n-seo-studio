import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { Blog } from "@/lib/types";

const STATUS: Record<Blog["status"], [string, string]> = {
  concept: ["concept", "text-warn"],
  gepland: ["ingepland", "text-accent"],
  live: ["live", "text-ok"],
  mislukt: ["mislukt", "text-bad"],
};

export const datum = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function BlogKaart({ b }: { b: Blog }) {
  return (
    <Link href={`/blog/${b.id}`} className="kaart rij group flex flex-col overflow-hidden">
      {b.beeld ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/beeld/${b.beeld}`} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-surface2 text-muted">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className={`lbl !text-[9.5px] ${STATUS[b.status][1]}`}>{STATUS[b.status][0]}{b.status === "gepland" ? ` · ${datum(b.geplandVoor)}` : ""}</div>
        <h2 className="mt-1 font-medium leading-snug group-hover:text-accent">{b.titel || b.onderwerp}</h2>
        {b.intro && <p className="mt-2 line-clamp-2 text-sm text-muted">{b.intro}</p>}
        {b.fout && <p className="mt-2 line-clamp-2 text-xs text-bad">{b.fout}</p>}
        <div className="mono mt-auto pt-3 text-[11px] text-muted">{b.categorie || "geen categorie"} · {datum(b.gemaakt)}</div>
      </div>
    </Link>
  );
}
