import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beeld as maakBeeld } from "./ai";
import { BEELDEN } from "./opslag";
import type { AiInstellingen } from "./types";

// Maakt de uitgelichte afbeelding met OpenAI en bewaart hem als lichte WebP in data/beelden.
export async function nieuwBeeld(ai: AiInstellingen, prompt: string, naam: string): Promise<string> {
  const ruw = await maakBeeld(ai.sleutel, ai.beeldmodel, prompt);
  const webp = await sharp(ruw).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await mkdir(BEELDEN, { recursive: true });
  const bestand = `${naam.replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "blog"}-${Date.now().toString(36)}.webp`;
  await writeFile(path.join(BEELDEN, bestand), webp);
  return bestand;
}

export async function leesBeeld(bestand: string): Promise<Buffer> {
  if (!/^[a-z0-9-]+\.webp$/i.test(bestand)) throw new Error("Ongeldige bestandsnaam");
  return readFile(path.join(BEELDEN, bestand));
}
