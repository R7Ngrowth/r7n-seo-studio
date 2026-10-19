import { redirect } from "next/navigation";
import { instellingen } from "./opslag";

// Zolang de wizard niet is doorlopen, gaat elke pagina naar /start.
export async function vereisSetup() {
  const i = await instellingen();
  if (!i.klaar) redirect("/start");
  return i;
}
