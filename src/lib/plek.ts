import { eigenApi } from "./eigenapi";
import { shopify } from "./shopify";
import type { Koppeling } from "./types";
import { wordpress, type Geplaatst, type Plaatsing } from "./wordpress";

// Eén ingang voor alle platformen: de rest van de studio hoeft niet te weten waar de blog heen gaat.
export interface Plek {
  test(): Promise<string>;
  categorieen(): Promise<string[]>;
  berichten(): Promise<{ titel: string; url: string; adres: string }[]>;
  adresVrij(adres: string, eigenId?: string | null): Promise<boolean>;
  plaats(p: Plaatsing, bestaandId?: string | null): Promise<Geplaatst>;
  verwijder(id: string): Promise<void>;
}

export const PLATFORMEN = {
  wordpress: "WordPress",
  shopify: "Shopify",
  anders: "Ander platform",
  geen: "Nog niet gekoppeld",
} as const;

// null = er is (nog) niets om automatisch naar te publiceren: de gebruiker kopieert en plakt zelf.
export function plek(k: Koppeling): Plek | null {
  if (k.cms === "wordpress") return wordpress(k);
  if (k.cms === "shopify") return shopify(k);
  if (k.cms === "anders" && k.andersManier === "api") return eigenApi(k);
  return null;
}
