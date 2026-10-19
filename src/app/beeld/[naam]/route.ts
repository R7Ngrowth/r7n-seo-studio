import { leesBeeld } from "@/lib/beeld";

// Toont een afbeelding uit data/beelden (alleen lokaal).
export async function GET(_req: Request, { params }: RouteContext<"/beeld/[naam]">) {
  try {
    const data = await leesBeeld((await params).naam);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Niet gevonden", { status: 404 });
  }
}
