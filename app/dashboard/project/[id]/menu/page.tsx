import Link from 'next/link'
import { ArrowLeft, UtensilsCrossed, ChevronRight, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { getMenuCategories } from '@/app/actions/menu'
import AddCategoryForm from '@/components/AddCategoryForm'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type MenuCategory = Database['public']['Tables']['menu_categories']['Row']

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Speisekarte | Bizzn',
}

export default async function MenuBuilderPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) {
    notFound()
  }

  const { data: categories } = await getMenuCategories(params.id)
  const safeCategories: MenuCategory[] = categories ?? []

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8 font-sans selection:bg-[#C7A17A]/30">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back link */}
        <Link
          href={`/dashboard/project/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#C7A17A] bg-[#242424] border border-gray-800 px-4 py-2 rounded-xl transition-all hover:border-[#C7A17A]/30 w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zum Restaurant
        </Link>

        {/* Header */}
        <div className="bg-[#242424] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex items-center gap-5">
          <div className="w-14 h-14 bg-[#C7A17A]/10 rounded-2xl flex items-center justify-center border border-[#C7A17A]/20 shadow-inner">
            <UtensilsCrossed className="text-[#C7A17A] w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Speisekarte verwalten</h1>
            <p className="text-gray-400">{project.name}</p>
          </div>
        </div>

        {/* Add Category */}
        <div className="bg-[#242424] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-5">Neue Kategorie anlegen</h2>
          <AddCategoryForm projectId={params.id} />
        </div>

        {/* Category List */}
        <div className="bg-[#242424] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Kategorien</h2>
            <span className="bg-[#C7A17A]/10 text-[#C7A17A] text-xs font-bold px-3 py-1 rounded-full border border-[#C7A17A]/20">
              {safeCategories.length} gesamt
            </span>
          </div>

          {safeCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-700 rounded-2xl">
              <FolderOpen className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">Noch keine Kategorien angelegt.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {safeCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/dashboard/project/${params.id}/menu/${cat.id}`}
                    className="group flex justify-between items-center bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800 hover:border-[#C7A17A]/40 hover:bg-[#C7A17A]/5 transition-all duration-300 shadow-sm"
                  >
                    <span className="font-medium text-gray-200 group-hover:text-[#C7A17A] transition-colors">{cat.name}</span>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#C7A17A]/70 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
