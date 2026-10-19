import Link from "next/link";
import type { ReactNode } from "react";

// Het R7N-logo. `size` is de hoogte; het logo is ongeveer twee keer zo breed.
// De bestanden hebben een doorzichtige achtergrond, dus het logo werkt op elk vlak.
export function Merk({ size = 36, gloed = false }: { size?: number; gloed?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={gloed ? "/merk/r7n-logo-gloed.png" : size > 60 ? "/merk/r7n-logo.png" : "/merk/r7n-logo-klein.png"}
      alt="R7N Growth"
      height={size}
      style={{ height: size, width: "auto" }}
      className="shrink-0 select-none"
      draggable={false}
    />
  );
}

// De blikvanger bovenaan elke pagina: genummerd label, serif-titel, context en rechts het ene cijfer dat ertoe doet.
export function Hero({
  title,
  lines,
  right,
  logo,
  onder,
  nummer,
  label,
  meta,
}: {
  title: string;
  lines: ReactNode[];
  right?: ReactNode;
  logo?: ReactNode;
  onder?: ReactNode;
  nummer?: string; // romeins cijfer, bijv. "I"
  label?: string; // klein label boven de titel, bijv. "Mission Control"
  meta?: ReactNode[]; // regel onder de tekst: tijd · rol · status
}) {
  return (
    <header className="kaart hero mb-5 flex flex-wrap items-start justify-between gap-6 p-6 md:p-7">
      <div className="flex min-w-0 items-start gap-5">
        {logo}
        <div className="min-w-0">
          {(nummer || label) && (
            <div className="mb-2 flex items-center gap-3">
              {nummer && <span className="sectie-nr">{nummer}</span>}
              <span className="sectie-streep" />
              <span className="lbl !text-[10px]">{label ?? title}</span>
            </div>
          )}
          <h1 className="titel text-[2.4rem] md:text-[2.9rem]">{title}</h1>
          {lines.map((l, i) => (
            <p key={i} className={`mt-1.5 text-sm ${i === 0 ? "text-muted" : "font-medium"}`}>
              {l}
            </p>
          ))}
          {meta && meta.length > 0 && (
            <div className="lbl mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 !text-[10px]">
              {meta.map((m, i) => (
                <span key={i} className="flex items-center gap-2.5">
                  {i > 0 && <span className="text-line">·</span>}
                  {m}
                </span>
              ))}
            </div>
          )}
          {onder}
        </div>
      </div>
      {right && <div className="text-right">{right}</div>}
    </header>
  );
}

// Genummerde sectiekop tussen de blokken: "II — Agents · open een control room".
export function Sectie({ nummer, titel, sub, right }: { nummer: string; titel: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="sectie">
      <span className="sectie-nr">{nummer}</span>
      <span className="sectie-streep" />
      <span className="lbl !text-[10px] !text-text">{titel}</span>
      {sub && <span className="lbl hidden !text-[10px] sm:inline">· {sub}</span>}
      <span className="sectie-rest" />
      {right && <span className="text-xs text-muted">{right}</span>}
    </div>
  );
}

// Compacte cijfertegel voor de rij bovenaan: label met statusstip, cijfer, één regel uitleg.
export function Tegel({
  label,
  value,
  sub,
  stip,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  stip?: "ok" | "warn" | "bad" | "accent";
}) {
  const kleur = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", accent: "bg-accent" };
  return (
    <div className="tegel">
      <div className="flex items-center justify-between gap-2">
        <span className="lbl !text-[9.5px]">{label}</span>
        {stip && <span className={`h-1.5 w-1.5 rounded-full ${kleur[stip]}`} />}
      </div>
      <div className="tegel-waarde mt-2">{value}</div>
      {sub && <div className="mt-1 truncate text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

// Live-stip: pulserend groen puntje met tekst.
export function Live({ tekst = "Live" }: { tekst?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-ok">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
      </span>
      {tekst}
    </span>
  );
}

export function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`kaart p-5 ${className}`}>
      {(title || meta) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="kop">{title}</h2>}
          {meta && <div className="text-xs text-muted">{meta}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// Kleine lijngrafiek: lijn met zachte vulling eronder en een punt op de laatste waarde.
export function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-10" />;
  const max = Math.max(1, ...values);
  const punt = (v: number, i: number) => [(i / (values.length - 1)) * 100, 27 - (v / max) * 22] as const;
  const pts = values.map((v, i) => punt(v, i).join(",")).join(" ");
  const [lx, ly] = punt(values[values.length - 1], values.length - 1);
  const id = `spark-${values.length}-${Math.round(max)}`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,30 ${pts} 100,30`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.2" fill="var(--accent)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Stat({
  label,
  caption,
  value,
  chip,
  spark,
  klein = false,
}: {
  label: string;
  caption?: string;
  value: ReactNode;
  chip?: string;
  spark?: number[];
  klein?: boolean; // rustiger weergave, voor diagnose-cijfers
}) {
  if (klein)
    return (
      <div className="flex items-baseline justify-between gap-3 rounded-xl border border-line/70 bg-surface/60 px-4 py-3">
        <div className="min-w-0">
          <div className="lbl">{label}</div>
          {caption && <div className="mt-0.5 truncate text-xs text-muted">{caption}</div>}
        </div>
        <div className="mono text-lg font-semibold tabular-nums">{value}</div>
      </div>
    );
  return (
    <div className="kaart flex flex-col p-5">
      <div className="lbl !text-text">{label}</div>
      <div className="mt-2.5 text-xs text-muted">{caption ?? " "}</div>
      <div className="mono mt-1 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {chip && (
        <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-md bg-accent/10 px-2 py-1 text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {chip}
        </div>
      )}
      {spark && (
        <div className="mt-auto pt-3">
          <Spark values={spark} />
        </div>
      )}
    </div>
  );
}

// Kern-KPI: groot cijfer, met het verschil ten opzichte van de vorige periode eronder.
export function Kpi({
  label,
  value,
  caption,
  trend,
  toon = "neutraal",
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  trend?: { tekst: string; richting: "op" | "neer" | "gelijk"; goed?: boolean } | null;
  toon?: "neutraal" | "rood" | "oranje";
}) {
  const rand = toon === "rood" ? "!border-bad/50" : toon === "oranje" ? "!border-accent/50" : "";
  return (
    <div className={`kaart flex flex-col p-5 ${rand}`}>
      <div className="lbl !text-text">{label}</div>
      <div className="mono mt-3 text-4xl font-bold leading-none tracking-tight">{value}</div>
      {caption && <div className="mt-2 text-xs text-muted">{caption}</div>}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={trend.goed == null ? "text-muted" : trend.goed ? "text-ok" : "text-bad"} aria-hidden>
            {trend.richting === "op" ? "▲" : trend.richting === "neer" ? "▼" : "■"}
          </span>
          <span className="text-muted">{trend.tekst}</span>
        </div>
      )}
    </div>
  );
}

const TONE: Record<string, string> = {
  actief: "border-ok/40 bg-ok/10 text-ok",
  klaar: "border-ok/40 bg-ok/10 text-ok",
  lopend: "border-accent/50 bg-accent/10 text-accent",
  bezig: "border-accent/50 bg-accent/10 text-accent",
  wacht: "border-warn/40 bg-warn/10 text-warn",
  gepland: "border-warn/40 bg-warn/10 text-warn",
  open: "border-line bg-surface2/60 text-muted",
  afgesloten: "border-line bg-surface2/60 text-muted",
  // termijnen
  verwacht: "border-line bg-surface2/60 text-muted",
  te_bevestigen: "border-warn/40 bg-warn/10 text-warn",
  nu_factureren: "border-accent/50 bg-accent/10 text-accent",
  gefactureerd: "border-text/30 bg-text/5 text-text",
  uitbetaald: "border-ok/40 bg-ok/10 text-ok",
  // aandacht en gezondheid
  rood: "border-bad/50 bg-bad/10 text-bad",
  fout: "border-bad/50 bg-bad/10 text-bad",
  oranje: "border-accent/50 bg-accent/10 text-accent",
  geel: "border-warn/40 bg-warn/10 text-warn",
  groen: "border-ok/40 bg-ok/10 text-ok",
  gelukt: "border-ok/40 bg-ok/10 text-ok",
  hoog: "border-accent/50 bg-accent/10 text-accent",
  normaal: "border-line bg-surface2/60 text-muted",
  laag: "border-line bg-surface2/60 text-muted",
};

export function Pill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`mono inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${TONE[status] ?? TONE.open}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function Bars({
  data,
  sorteer = true,
  breed = false,
}: {
  data: Record<string, number>;
  sorteer?: boolean;
  breed?: boolean;
}) {
  const entries = sorteer ? Object.entries(data).sort((a, b) => b[1] - a[1]) : Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <ul className="space-y-2.5">
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-center gap-3 text-sm">
          <span
            className={`${breed ? "w-36 truncate sm:w-60" : "w-28 capitalize"} shrink-0 text-muted`}
            title={breed ? k : undefined}
          >
            {k}
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-surface2">
            <div
              className="h-1.5 rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${(v / max) * 100}%`, opacity: v ? 1 : 0 }}
            />
          </div>
          <span className="mono w-6 text-right tabular-nums">{v}</span>
        </li>
      ))}
    </ul>
  );
}

export function Rows<T>({
  items,
  render,
}: {
  items: T[];
  render: (item: T) => { key: string; title: string; sub?: string; right?: ReactNode };
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it) => {
        const r = render(it);
        return (
          <li key={r.key} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.title}</div>
              {r.sub && <div className="mt-0.5 text-xs text-muted">{r.sub}</div>}
            </div>
            {r.right}
          </li>
        );
      })}
    </ul>
  );
}

const KLEUR_NAAM: Record<string, string> = {
  rood: "Urgent",
  oranje: "Belangrijk",
  geel: "Opvolgen",
  normaal: "Normaal",
};

const meetmoment = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

// Eén alert: wat er speelt, uit welke bron, welk cijfer, waarom, wanneer gemeten en wat de vervolgstap is.
// De achtergrondkleur zegt direct hoe urgent het is.
export function MeldingLijst({
  items,
}: {
  items: {
    kleur: string;
    titel: string;
    bron?: string;
    metric?: string;
    reden: string;
    tijdstip?: string;
    actie?: string;
    href: string;
  }[];
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((m, i) => (
        <li key={i}>
          <Link href={m.href} className={`melding melding-${m.kleur in KLEUR_NAAM ? m.kleur : "normaal"} group block px-4 py-3.5`}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div className="font-medium group-hover:text-accent">{m.titel}</div>
              <Pill status={m.kleur} label={KLEUR_NAAM[m.kleur] ?? m.kleur} />
            </div>
            {m.metric && <div className="mono mt-1.5 text-sm">{m.metric}</div>}
            <div className="mt-1 text-sm text-muted">{m.reden}</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              {m.bron && (
                <span>
                  <span className="lbl !text-[9.5px]">Bron</span> {m.bron}
                </span>
              )}
              {m.tijdstip && (
                <span>
                  <span className="lbl !text-[9.5px]">Gemeten</span> {meetmoment(m.tijdstip)}
                </span>
              )}
              {m.actie && <span className="ml-auto font-medium text-accent">{m.actie} →</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Trechter: elke stap met aantal en het deel dat van de vorige stap overblijft.
// Een stap zonder meting (aantal = null) wordt getoond als "nog niet gemeten", zonder getal.
export function Trechter({ stappen }: { stappen: { naam: string; aantal: number | null; noot?: string }[] }) {
  const max = Math.max(1, ...stappen.map((s) => s.aantal ?? 0));
  return (
    <ol className="space-y-2">
      {stappen.map((s, i) => {
        // De vorige stap die wél gemeten is, om het percentage tegen af te zetten.
        const vorige = stappen.slice(0, i).reverse().find((v) => v.aantal != null);
        const deel = s.aantal != null && vorige?.aantal ? (s.aantal / vorige.aantal) * 100 : null;
        return (
          <li key={s.naam} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,17rem)_1fr_auto] items-center gap-3 text-sm">
            <span className={`truncate ${s.aantal == null ? "text-muted/60" : "text-muted"}`} title={s.naam}>
              {s.naam}
            </span>
            {s.aantal == null ? (
              <div className="h-7 rounded-md border border-dashed border-line px-3 text-xs leading-7 text-muted/70">
                nog niet gemeten{s.noot ? ` · ${s.noot}` : ""}
              </div>
            ) : (
              <div className="h-7 rounded-md bg-surface2">
                <div
                  className="flex h-7 items-center rounded-md bg-gradient-to-r from-accent to-accent/70 px-2 transition-[width] duration-500"
                  style={{ width: `${Math.max((s.aantal / max) * 100, 3)}%` }}
                />
              </div>
            )}
            <span className="mono w-28 text-right tabular-nums">
              {s.aantal ?? "—"}
              {deel != null && (
                <span className="ml-2 text-xs text-muted">{deel >= 10 ? Math.round(deel) : deel.toFixed(1).replace(".", ",")}%</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Hoe vers is de data? Per bron: gekoppeld of niet, laatste geslaagde sync en een eventuele fout.
export function BronnenStatus({
  bronnen,
}: {
  bronnen: { naam: string; gekoppeld: boolean; laatstGelukt?: string | null; fout?: string | null; noot?: string }[];
}) {
  return (
    <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {bronnen.map((b) => (
        <li key={b.naam} className="flex items-start justify-between gap-3 border-b border-line/60 pb-3 text-sm">
          <div className="min-w-0">
            <div className="font-medium">{b.naam}</div>
            <div className="mt-0.5 text-xs text-muted">
              {!b.gekoppeld
                ? (b.noot ?? "Nog niet gekoppeld")
                : b.laatstGelukt
                  ? `Laatst bijgewerkt ${meetmoment(b.laatstGelukt)}`
                  : "Nog geen geslaagde sync"}
              {b.gekoppeld && b.fout ? ` · laatste poging mislukt: ${b.fout}` : ""}
            </div>
          </div>
          <Pill
            status={!b.gekoppeld ? "open" : b.fout ? "wacht" : "actief"}
            label={!b.gekoppeld ? "niet gekoppeld" : b.fout ? "loopt achter" : "gekoppeld"}
          />
        </li>
      ))}
    </ul>
  );
}

// Tussenkop binnen een tab, met een korte uitleg wat de laag laat zien.
export function Laag({ titel, uitleg, children }: { titel: string; uitleg?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="sectie !my-0 !mt-2">
        <span className="sectie-streep" />
        <span className="lbl !text-[10px] !text-text">{titel}</span>
        {uitleg && <span className="lbl hidden !text-[10px] sm:inline">· {uitleg}</span>}
        <span className="sectie-rest" />
      </h2>
      {children}
    </section>
  );
}

export function Tabs({
  basis,
  actief,
  tabs,
  extra = "",
}: {
  basis: string;
  actief: string;
  tabs: { id: string; titel: string; intern?: boolean }[];
  extra?: string; // extra parameter die bij elke tab mee moet, bijv. "weergave=klant"
}) {
  const href = (id: string, eerste: boolean) => {
    const q = [eerste ? "" : `tab=${id}`, extra].filter(Boolean).join("&");
    return q ? `${basis}?${q}` : basis;
  };
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-px">
      {tabs.map((t, i) => (
        <Link
          key={t.id}
          href={href(t.id, i === 0)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
            t.id === actief ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
          }`}
        >
          {t.titel}
          {t.intern && <span className="lbl ml-2 !text-[8.5px]">intern</span>}
        </Link>
      ))}
    </nav>
  );
}

// Voor onderdelen waar de bron nog niet gekoppeld is: geen cijfers, wel duidelijk wat er komt.
export function NietGekoppeld({ titel, bron, items }: { titel: string; bron: string; items: string[] }) {
  return (
    <Panel title={titel} meta="nog niet gekoppeld">
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i} className="flex items-center justify-between gap-3 border-b border-line/60 py-1.5 text-sm">
            <span className="text-muted">{i}</span>
            <span className="mono text-muted">—</span>
          </li>
        ))}
      </ul>
      <p className="mono mt-4 text-[11px] text-muted">Bron: {bron}</p>
    </Panel>
  );
}

// Voor cijfers die nog niet met de bron zijn nagelopen.
export function Voorlopig({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3 text-xs leading-relaxed text-warn">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
      <span>{children}</span>
    </div>
  );
}

// Kolomgrafiek voor verloop over tijd: één reeks, waarde op elke kolom, de lopende periode lichter.
export function Kolommen({
  items,
  eenheid,
}: {
  items: { label: string; waarde: number; lopend?: boolean; titel?: string }[];
  eenheid: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.waarde));
  if (!items.length) return <Empty>Nog geen data.</Empty>;
  return (
    <ul className="flex items-end gap-1 overflow-x-auto pt-8">
      {items.map((i) => (
        <li key={i.label} className="group relative flex w-12 shrink-0 flex-col items-center">
          <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded border border-line bg-surface2 px-2 py-1 text-[11px] text-text group-hover:block">
            {i.titel ?? i.label} · {i.waarde} {eenheid}
            {i.lopend ? " · loopt nog" : ""}
          </div>
          <span className="mono mb-1 text-[11px] tabular-nums text-text">{i.waarde}</span>
          <div className="flex h-28 w-full items-end justify-center border-b border-line">
            <div
              className={`w-6 rounded-t bg-accent ${i.lopend ? "opacity-45" : ""}`}
              style={{ height: `${(i.waarde / max) * 100}%` }}
            />
          </div>
          <span className={`mono mt-1.5 text-[10px] ${i.lopend ? "text-text" : "text-muted"}`}>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}

// Vaste kleurvolgorde voor verdelingen; gecontroleerd op kleurenblindheid tegen de donkere achtergrond.
const DONUT_KLEUREN = ["#d95926", "#3987e5", "#199e70", "#5b6274"];

// Cirkeldiagram voor een verdeling van één geheel in hooguit vier stukken (de rest wordt "overig").
export function Donut({ data, eenheid }: { data: Record<string, number>; eenheid: string }) {
  const alle = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = alle.slice(0, 3);
  const rest = alle.slice(3).reduce((a, [, v]) => a + v, 0);
  const delen = rest ? [...top, ["overig", rest] as [string, number]] : top;
  const totaal = delen.reduce((a, [, v]) => a + v, 0);
  if (!totaal) return <Empty>Geen data.</Empty>;

  const r = 44;
  const omtrek = 2 * Math.PI * r;
  const spleet = delen.length > 1 ? 2 : 0;
  // Beginpunt van elk stuk op de cirkel: de som van alle stukken ervoor.
  const begin = delen.map((_, i) => delen.slice(0, i).reduce((a, [, v]) => a + (v / totaal) * omtrek, 0));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img" aria-label={`Verdeling van ${totaal} ${eenheid}`}>
        <g transform="rotate(-90 60 60)">
          {delen.map(([naam, v], i) => {
            const lengte = (v / totaal) * omtrek;
            return (
              <circle
                key={naam}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={naam === "overig" ? DONUT_KLEUREN[3] : DONUT_KLEUREN[i]}
                strokeWidth="14"
                strokeDasharray={`${Math.max(lengte - spleet, 0.5)} ${omtrek}`}
                strokeDashoffset={-begin[i]}
              >
                <title>{`${naam}: ${v} ${eenheid} (${Math.round((v / totaal) * 100)}%)`}</title>
              </circle>
            );
          })}
        </g>
        <text x="60" y="58" textAnchor="middle" className="mono" fill="var(--text)" fontSize="20" fontWeight="700">
          {totaal}
        </text>
        <text x="60" y="73" textAnchor="middle" fill="var(--muted)" fontSize="8.5" letterSpacing="1">
          {eenheid.toUpperCase()}
        </text>
      </svg>
      <ul className="min-w-40 flex-1 space-y-2.5">
        {delen.map(([naam, v], i) => (
          <li key={naam} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: naam === "overig" ? DONUT_KLEUREN[3] : DONUT_KLEUREN[i] }}
            />
            <span className="min-w-0 flex-1 truncate text-muted" title={naam}>
              {naam}
            </span>
            <span className="mono tabular-nums">{v}</span>
            <span className="mono w-10 text-right tabular-nums text-muted">{Math.round((v / totaal) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
