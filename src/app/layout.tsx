import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Menu } from "@/components/Menu";
import { instellingen } from "@/lib/opslag";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "R7N SEO Studio",
  description: "Zoek SEO-kansen, laat blogs schrijven en publiceer ze op je eigen website.",
};

// Alle pagina's lezen je lokale bestanden; nooit vooraf vastzetten.
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#06070a" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const i = await instellingen();
  return (
    <html lang="nl" className={`${sans.variable} ${mono.variable} ${serif.variable} antialiased`}>
      <body>
        <Menu site={i.profiel.website}>{children}</Menu>
      </body>
    </html>
  );
}
