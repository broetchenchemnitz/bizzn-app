import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fisher-Yates shuffle for fair rotation
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const cuisine = searchParams.get("cuisine") ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select(
      "id, name, slug, description, cuisine_type, cover_image_url, city, address, postal_code"
    )
    .eq("is_public", true);

  // Smart-Search: city param matched gegen city UND postal_code (OR)
  // → Nutzer können sowohl "Chemnitz" als auch "09116" eintippen
  if (city) {
    query = query.or(`city.ilike.%${city}%,postal_code.ilike.%${city}%`);
  }
  if (cuisine) query = query.ilike("cuisine_type", `%${cuisine}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Faire Zufalls-Rotation — kein Algorithmus bevorzugt zahlende Restaurants
  const shuffled = shuffle(data ?? []);

  return NextResponse.json({ restaurants: shuffled });
}
