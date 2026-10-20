"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/lokaal", titel: "Analyse" },
  { href: "/lokaal/oplossen", titel: "Los alles op" },
  { href: "/lokaal/profielen", titel: "Profielen" },
];

export function LokaalTabs() {
  const pad = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-px">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
            pad === t.href ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
          }`}
        >
          {t.titel}
        </Link>
      ))}
    </nav>
  );
}
