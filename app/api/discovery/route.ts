import { createClient } from "@supabase/supabase-js";
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

const NEW_RESTAURANT_DAYS = 14;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const cuisine = searchParams.get("cuisine") ?? "";
  const dealsOnly = searchParams.get("deals") === "1";
  const newOnly = searchParams.get("new") === "1";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let query = supabase
    .from("projects")
    .select(
      "id, name, slug, description, cuisine_type, cover_image_url, city, address, postal_code, welcome_discount_enabled, welcome_discount_pct, created_at"
    )
    .eq("is_public", true);

  // Smart-Search: city param matched gegen city UND postal_code (OR)
  if (city) {
    query = query.or(`city.ilike.%${city}%,postal_code.ilike.%${city}%`);
  }
  if (cuisine) query = query.ilike("cuisine_type", `%${cuisine}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEW_RESTAURANT_DAYS);

  // Enrich each restaurant with computed fields
  const enriched = (data ?? []).map((r) => {
    const isNew = r.created_at ? new Date(r.created_at) >= cutoff : false;
    const dealBadge =
      r.welcome_discount_enabled && r.welcome_discount_pct
        ? `${r.welcome_discount_pct}% auf Erstbestellung`
        : null;

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      cuisine_type: r.cuisine_type,
      cover_image_url: r.cover_image_url,
      city: r.city,
      address: r.address,
      postal_code: r.postal_code,
      welcome_discount_pct: r.welcome_discount_pct ?? null,
      deal_badge: dealBadge,
      is_new: isNew,
    };
  });

  // Apply optional filters
  let filtered = enriched;
  if (dealsOnly) filtered = filtered.filter((r) => r.deal_badge !== null);
  if (newOnly) filtered = filtered.filter((r) => r.is_new);

  // Faire Zufalls-Rotation — kein Algorithmus bevorzugt zahlende Restaurants
  const shuffled = shuffle(filtered);

  return NextResponse.json({ restaurants: shuffled });
}
