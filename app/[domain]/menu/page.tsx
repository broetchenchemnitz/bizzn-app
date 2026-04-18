import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Metadata } from 'next'
import InlineMenuBoard from '@/components/storefront/InlineMenuBoard'

export const dynamic = 'force-dynamic'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

function createAnonSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getMenuData(slug: string) {
  noStore() // Kein Caching — immer aktuelle DB-Daten laden
  const supabase = createAnonSupabase()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single<ProjectRow>()

  if (!project) return null

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*, menu_option_groups(*, menu_options(*)))')
    .eq('project_id', project.id)
    .order('sort_order', { ascending: true })

  const typedCategories = (categories ?? []) as (MenuCategory & {
    menu_items: MenuItem[]
  })[]

  return { project, categories: typedCategories }
}

export async function generateMetadata({
  params,
}: {
  params: { domain: string }
}): Promise<Metadata> {
  const data = await getMenuData(params.domain)
  const name = data?.project.name ?? params.domain
  return {
    title: `Speisekarte – ${name} | bizzn`,
    description: `Die digitale Speisekarte von ${name}. Jetzt direkt bestellen ohne Provision.`,
  }
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: { domain: string }
  searchParams?: { table?: string; mode?: string }
}) {
  const data = await getMenuData(params.domain)

  if (!data) {
    notFound()
  }

  const { project, categories } = data
  const tableNumber = searchParams?.table ?? null

  // M16: Rabatt-Info für Storefront — prüfe ob Kunde Erstkunde ist
  const rawDiscountEnabled = project.welcome_discount_enabled ?? false
  let isEligibleForDiscount = rawDiscountEnabled

  if (rawDiscountEnabled) {
    // Read-only Session-Check (keine Cookie-Writes → sicher in Server Components)
    const { cookies } = await import('next/headers')
    const { createServerClient } = await import('@supabase/ssr')
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
      // Service Role Client für die Order-Zählung (bypassed RLS)
      const adminSB = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { count } = await adminSB
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .neq('payment_status', 'failed') // Alle aufgegebenen Bestellungen zählen
      // Wenn bereits Bestellungen vorhanden → kein Willkommensrabatt mehr
      if ((count ?? 0) > 0) isEligibleForDiscount = false
    }
  }

  const discountInfo = {
    enabled: isEligibleForDiscount,
    pct: project.welcome_discount_pct ?? 10,
  }

  // M19: Liefer-Info für Storefront
  const deliveryInfo = {
    enabled: project.delivery_enabled ?? true,
    feeCents: project.delivery_fee_cents ?? 0,
    minOrderCents: project.min_order_cents ?? 0,
    freeAboveCents: project.free_delivery_above_cents ?? 0,
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px', background: '#0d0d0d', minHeight: '100vh', position: 'relative', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
        <InlineMenuBoard
          projectId={project.id}
          slug={project.slug}
          projectName={project.name}
          categories={categories}
          discountInfo={discountInfo}
          deliveryInfo={deliveryInfo}
          cartKey={`bizzn-cart-${project.id}${tableNumber ? `-table-${tableNumber}` : ''}`}
          pickupEnabled={true}
          inStoreEnabled={project.in_store_enabled ?? false}
          tableNumber={tableNumber}
          pickupSlotsEnabled={project.pickup_slots_enabled ?? false}
          stripeEnabled={!!(project.online_payment_enabled && project.stripe_charges_enabled)}
          stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        />
      </div>
    </div>
  )
}
