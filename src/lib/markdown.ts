import { marked } from "marked";

// Markdown → HTML voor de website. Bouwstenen ([r7n_cta …], [r7n_tip]…[/r7n_tip]) blijven losse blokken,
// zodat de R7N Blog-plugin ze netjes kan tonen in plaats van ze in een alinea te stoppen.
const BOUWSTEEN = /^\s*(\[r7n_\w+[^\]]*\](?:.*\[\/r7n_\w+\])?)\s*$/;

export function naarHtml(md: string): string {
  const bewaard: string[] = [];
  const voorbereid = md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((regel) => {
      const m = regel.match(BOUWSTEEN);
      if (!m) return regel;
      bewaard.push(m[1]);
      return `\n<!--r7n:${bewaard.length - 1}-->\n`;
    })
    .join("\n");
  const html = marked.parse(voorbereid, { async: false, gfm: true, breaks: false }) as string;
  return html.replace(/<!--r7n:(\d+)-->/g, (_, i: string) => bewaard[Number(i)] ?? "").trim();
}

// Zonder plugin op de site laten we bouwstenen weg (anders staan ze als losse code in de tekst).
export const zonderBouwstenen = (md: string) => md.replace(/^\s*\[\/?r7n_[^\n]*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
