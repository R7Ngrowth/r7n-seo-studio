// AI via OpenRouter: één sleutel voor tekst (Claude) en beeld (OpenAI). De sleutel staat alleen lokaal.
const BASIS = "https://openrouter.ai/api/v1";

export interface Bericht {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AiFout extends Error {}

async function vraag(sleutel: string, body: Record<string, unknown>) {
  if (!sleutel.trim()) throw new AiFout("Er is nog geen OpenRouter-sleutel ingevuld. Ga naar Instellingen.");
  const res = await fetch(`${BASIS}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sleutel.trim()}`,
      "Content-Type": "application/json",
      "X-Title": "R7N SEO Studio",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(280_000),
  });
  if (res.ok) return res.json();
  const tekst = await res.text();
  const uitleg: Record<number, string> = {
    401: "OpenRouter kent deze sleutel niet. Gebruik een gewone API-sleutel (Keys → Create Key), geen Management-sleutel.",
    402: "Het tegoed op OpenRouter is op, of de limiet van deze sleutel is bereikt.",
    429: "OpenRouter krijgt even te veel verzoeken. Probeer het over een minuut opnieuw.",
  };
  throw new AiFout(uitleg[res.status] ?? `OpenRouter gaf een fout (${res.status}): ${tekst.slice(0, 240)}`);
}

export async function tekst(sleutel: string, model: string, berichten: Bericht[], maxTokens = 8000): Promise<string> {
  const data = await vraag(sleutel, { model, messages: berichten, max_tokens: maxTokens });
  const uit = data?.choices?.[0]?.message?.content;
  if (typeof uit !== "string" || !uit.trim()) throw new AiFout("Het model gaf een leeg antwoord. Probeer het opnieuw.");
  return uit;
}

// Vraagt om JSON en haalt het object uit het antwoord, ook als het model er tekst of een codeblok omheen zet.
export async function json<T>(sleutel: string, model: string, berichten: Bericht[], maxTokens = 8000): Promise<T> {
  const ruw = await tekst(sleutel, model, berichten, maxTokens);
  const begin = ruw.indexOf("{");
  const eind = ruw.lastIndexOf("}");
  if (begin < 0 || eind <= begin) throw new AiFout("Het model gaf geen bruikbaar antwoord terug. Probeer het opnieuw.");
  try {
    return JSON.parse(ruw.slice(begin, eind + 1)) as T;
  } catch {
    throw new AiFout("Het antwoord van het model was niet compleet. Probeer het opnieuw.");
  }
}

export async function beeld(sleutel: string, model: string, prompt: string): Promise<Buffer> {
  const data = await vraag(sleutel, { model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] });
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new AiFout("Er kwam geen afbeelding terug. Controleer of het beeldmodel beschikbaar is op je sleutel.");
  return Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
}

// Controle zonder kosten.
export async function controleerSleutel(sleutel: string): Promise<{ ok: boolean; melding: string }> {
  try {
    const res = await fetch(`${BASIS}/key`, { headers: { Authorization: `Bearer ${sleutel.trim()}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { ok: false, melding: "OpenRouter kent deze sleutel niet. Kopieer hem opnieuw." };
    const d = (await res.json())?.data ?? {};
    if (d.is_management_key || d.is_provisioning_key)
      return { ok: false, melding: "Dit is een Management-sleutel. Maak een gewone sleutel aan onder Keys → Create Key." };
    return { ok: true, melding: d.limit == null ? "Sleutel werkt." : `Sleutel werkt (limiet $${d.limit}).` };
  } catch {
    return { ok: false, melding: "OpenRouter is niet bereikbaar. Controleer je internetverbinding." };
  }
}
