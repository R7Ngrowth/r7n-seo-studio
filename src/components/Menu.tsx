"use client";

import { BookOpen, CalendarClock, FileText, LayoutDashboard, MapPin, PenLine, Radar, Radio, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Merk } from "./ui";

const ITEMS = [
  { href: "/", label: "Overzicht", icoon: LayoutDashboard },
  { href: "/kansen", label: "Kansen", icoon: Radar },
  { href: "/nieuw", label: "Nieuwe blog", icoon: PenLine },
  { href: "/concepten", label: "Concepten", icoon: FileText },
  { href: "/planning", label: "Planning", icoon: CalendarClock },
  { href: "/live", label: "Live", icoon: Radio },
  { href: "/lokaal", label: "Lokaal", icoon: MapPin },
  { href: "/instellingen", label: "Instellingen", icoon: Settings },
  { href: "/hulp", label: "Hoe werkt het", icoon: BookOpen },
];

// Vaste zijbalk op desktop, onderbalk op de telefoon. Tijdens de wizard (/start) geen menu.
export function Menu({ site, children }: { site: string; children: ReactNode }) {
  const pad = usePathname();
  if (pad.startsWith("/start")) return <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">{children}</main>;
  const actief = (href: string) => (href === "/" ? pad === "/" : pad.startsWith(href) || (href === "/concepten" && pad.startsWith("/blog/")));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/60 p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-3 px-2 pt-1">
          <Merk size={30} />
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold">SEO Studio</span>
            <span className="lbl block !text-[9px]">R7N Growth</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                actief(i.href) ? "bg-accent/12 font-medium text-text" : "text-muted hover:bg-surface2/60 hover:text-text"
              }`}
            >
              <i.icoon className={`h-4 w-4 ${actief(i.href) ? "text-accent" : ""}`} strokeWidth={1.75} />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 px-2 text-[11px] text-muted">
          {site && <div className="truncate">{site.replace(/^https?:\/\//, "")}</div>}
          <div className="lbl !text-[9px]">Op je computer · v1.3</div>
        </div>
      </aside>
      <main className="min-w-0 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-bg/95 backdrop-blur md:hidden">
        {ITEMS.slice(0, 5).map((i) => (
          <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${actief(i.href) ? "text-accent" : "text-muted"}`}>
            <i.icoon className="h-4 w-4" strokeWidth={1.75} />
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
