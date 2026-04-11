import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = createAnonClient()
  const { slug } = await params

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      id, name, slug,
      welcome_discount_enabled, welcome_discount_pct,
      delivery_enabled, delivery_fee_cents, min_order_cents, free_delivery_above_cents,
      in_store_enabled, pickup_slots_enabled,
      online_payment_enabled, stripe_charges_enabled
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 })
  }

  const { data: categories, error: catError } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*)')
    .eq('project_id', project.id)
    .order('sort_order', { ascending: true })

  if (catError) {
    return NextResponse.json({ error: 'Menü konnte nicht geladen werden' }, { status: 500 })
  }

  // ── Erstbesteller-Prüfung: Rabatt nur für echte Neukunden anzeigen ──────────
  let discountEnabled = project.welcome_discount_enabled ?? false

  if (discountEnabled) {
    try {
      const cookieStore = await cookies()
      const readOnlySB = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return cookieStore.get(name)?.value },
            set() {},    // no-op — read-only
            remove() {}, // no-op — read-only
          },
        }
      )
      const { data: { user } } = await readOnlySB.auth.getUser()

      if (user?.id) {
        const admin = createAdminClient()
        const { count } = await admin
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('user_id', user.id)
        // Wenn bereits Bestellungen → Rabatt-Banner ausblenden
        if ((count ?? 0) > 0) discountEnabled = false
      }
    } catch {
      // Session-Fehler → Rabatt anzeigen (konservativer Fallback; Server prüft beim Checkout nochmals)
    }
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      discountInfo: {
        enabled: discountEnabled,
        pct: project.welcome_discount_pct ?? 0,
      },
      deliveryInfo: {
        enabled: project.delivery_enabled ?? false,
        feeCents: project.delivery_fee_cents ?? 0,
        minOrderCents: project.min_order_cents ?? 0,
        freeAboveCents: project.free_delivery_above_cents ?? 0,
      },
      inStoreEnabled: project.in_store_enabled ?? false,
      pickupSlotsEnabled: project.pickup_slots_enabled ?? false,
      stripeEnabled: !!(project.online_payment_enabled && project.stripe_charges_enabled),
    },
    categories: categories ?? [],
  })
}
