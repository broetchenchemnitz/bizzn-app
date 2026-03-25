import Link from 'next/link'
import { ArrowLeft, UtensilsCrossed, CheckCircle2, XCircle, PackageOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { getCategory, getMenuItems } from '@/app/actions/menu'
import AddMenuItemForm from '@/components/AddMenuItemForm'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kategorie | Bizzn Speisekarte',
}

export default async function CategoryDetailPage({
  params,
}: {
  params: { id: string; categoryId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) notFound()

  const { data: category } = await getCategory(params.categoryId)
  if (!category) notFound()

  const { data: items } = await getMenuItems(params.categoryId)
  const safeItems: MenuItem[] = items ?? []

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back link */}
        <div>
          <Link
            href={`/dashboard/project/${params.id}/menu`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-600 transition-colors" />
            Zurück zur Übersicht
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F0FBD8] flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-6 h-6 text-[#77CC00]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{category.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{project.name} · Speisekarte</p>
            </div>
          </div>
        </div>

        {/* Add Item Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Neue Speise hinzufügen</h2>
          <AddMenuItemForm categoryId={params.categoryId} />
        </div>

        {/* Items list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-800">Speisen</h2>
            <span className="text-xs font-semibold text-[#77CC00] bg-[#F0FBD8] px-2.5 py-1 rounded-full border border-[#77CC00]/20">
              {safeItems.length} gesamt
            </span>
          </div>

          {safeItems.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-xl">
              <PackageOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Noch keine Speisen angelegt.</p>
              <p className="text-sm text-gray-400 mt-1">Füge deine erste Speise oben hinzu.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {safeItems.map((item) => (
                <li key={item.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{item.name}</span>
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#77CC00] bg-[#F0FBD8] px-2 py-0.5 rounded-full border border-[#77CC00]/20">
                          <CheckCircle2 className="w-3 h-3" /> Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Inaktiv
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                  <span className="text-base font-bold text-gray-900 whitespace-nowrap tabular-nums">
                    {formatPrice(item.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
