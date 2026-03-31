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
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans selection:bg-lime-500/30">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back link */}
        <Link href={`/dashboard/project/${params.id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-lime-400 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl transition-all hover:bg-slate-800 w-fit">
          <ArrowLeft className="w-4 h-4" /> Zurück zum Restaurant
        </Link>

        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex items-center gap-5">
          <div className="w-14 h-14 bg-lime-500/10 rounded-2xl flex items-center justify-center border border-lime-500/20 shadow-inner">
            <UtensilsCrossed className="text-lime-400 w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Speisekarte verwalten</h1>
            <p className="text-slate-400">{project.name}</p>
          </div>
        </div>

        {/* Add Category */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-200 mb-5">Neue Kategorie anlegen</h2>
          <AddCategoryForm projectId={params.id} />
        </div>

        {/* Category List */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-200">Kategorien</h2>
            <span className="bg-slate-800 text-lime-400 text-xs font-bold px-3 py-1 rounded-full border border-slate-700 shadow-inner">
              {safeCategories.length} gesamt
            </span>
          </div>

          {safeCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-950/30">
              <FolderOpen className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">Noch keine Kategorien angelegt.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {safeCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/dashboard/project/${params.id}/menu/${cat.id}`}
                    className="group flex justify-between items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 hover:border-lime-500/30 hover:bg-slate-800/40 transition-all duration-300 shadow-sm"
                  >
                    <span className="font-medium text-slate-200 group-hover:text-lime-400 transition-colors">{cat.name}</span>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-lime-500/70 transition-colors" />
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
