import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Metadata } from 'next'
import MenuBoard from '@/components/storefront/MenuBoard'

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
  const supabase = createAnonSupabase()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single<ProjectRow>()

  if (!project) return null

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*)')
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
  const isKiosk = searchParams?.mode === 'kiosk' || Boolean(tableNumber)

  // M16: Rabatt-Info für Storefront
  const discountInfo = {
    enabled: project.welcome_discount_enabled ?? false,
    pct: project.welcome_discount_pct ?? 10,
  }

  return (
    <MenuBoard
      projectId={project.id}
      projectName={project.name}
      domain={params.domain}
      categories={categories}
      initialTableNumber={tableNumber}
      kioskMode={isKiosk}
      discountInfo={discountInfo}
    />
  )
}
