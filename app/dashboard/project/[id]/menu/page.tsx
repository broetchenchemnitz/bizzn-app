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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back link */}
        <div>
          <Link
            href={`/dashboard/project/${params.id}`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-600 transition-colors" />
            Zurück zum Restaurant
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#F0FBD8] flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-[#77CC00]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Speisekarte verwalten</h1>
              <p className="text-sm text-gray-500 mt-0.5">{project.name}</p>
            </div>
          </div>
        </div>

        {/* Add Category */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Neue Kategorie anlegen</h2>
          <AddCategoryForm projectId={params.id} />
        </div>

        {/* Category List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-800">Kategorien</h2>
            <span className="text-xs font-semibold text-[#77CC00] bg-[#F0FBD8] px-2.5 py-1 rounded-full border border-[#77CC00]/20">
              {safeCategories.length} gesamt
            </span>
          </div>

          {safeCategories.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-xl">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Noch keine Kategorien angelegt.</p>
              <p className="text-sm text-gray-400 mt-1">Füge deine erste Kategorie oben hinzu.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {safeCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/dashboard/project/${params.id}/menu/${cat.id}`}
                    className="flex items-center justify-between py-4 px-2 rounded-xl hover:bg-[#F0FBD8]/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#F0FBD8] flex items-center justify-center group-hover:bg-[#77CC00]/20 transition-colors">
                        <UtensilsCrossed className="w-4 h-4 text-[#77CC00]" />
                      </span>
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#77CC00] transition-colors" />
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
