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

async function getStorefrontData(slug: string) {
  const supabase = createAnonSupabase()

  // Look up the project by case-insensitive name match on the subdomain slug
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .ilike('name', slug)
    .eq('status', 'active')
    .single<ProjectRow>()

  if (!project) return null

  // Fetch categories ordered by sort_order
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
  const data = await getStorefrontData(params.domain)
  const name = data?.project.name ?? params.domain
  return {
    title: `${name} | bizzn`,
    description: `Jetzt bei ${name} bestellen – direkt, schnell, ohne Gebühren.`,
  }
}

export default async function StorefrontPage({
  params,
}: {
  params: { domain: string }
}) {
  const data = await getStorefrontData(params.domain)

  if (!data) {
    notFound()
  }

  const { project, categories } = data

  return (
    <MenuBoard
      projectId={project.id}
      projectName={project.name}
      categories={categories}
    />
  )
}
