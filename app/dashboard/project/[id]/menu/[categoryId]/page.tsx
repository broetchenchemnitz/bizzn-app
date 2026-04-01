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
    <div className="min-h-screen bg-[#1a1a1a] p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back link */}
        <div>
          <Link
            href={`/dashboard/project/${params.id}/menu`}
            className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors bg-[#242424] px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 text-gray-500 group-hover:text-white transition-colors" />
            Zurück zur Übersicht
          </Link>
        </div>

        {/* Header */}
        <div className="bg-[#242424] rounded-2xl border border-gray-800 p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C7A17A]/10 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-6 h-6 text-[#C7A17A]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{category.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{project.name} · Speisekarte</p>
            </div>
          </div>
        </div>

        {/* Add Item Form */}
        <div className="bg-[#242424] rounded-2xl border border-gray-800 p-6">
          <h2 className="text-base font-semibold text-white mb-5">Neue Speise hinzufügen</h2>
          <AddMenuItemForm categoryId={params.categoryId} />
        </div>

        {/* Items list */}
        <div className="bg-[#242424] rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Speisen</h2>
            <span className="text-xs font-semibold text-[#C7A17A] bg-[#C7A17A]/10 px-2.5 py-1 rounded-full border border-[#C7A17A]/20">
              {safeItems.length} gesamt
            </span>
          </div>

          {safeItems.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-gray-700 rounded-xl">
              <PackageOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Noch keine Speisen angelegt.</p>
              <p className="text-sm text-gray-500 mt-1">Füge deine erste Speise oben hinzu.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {safeItems.map((item) => (
                <li key={item.id} className="py-4 flex items-start justify-between gap-4 group hover:bg-[#C7A17A]/5 rounded-lg px-2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white group-hover:text-[#C7A17A] transition-colors">{item.name}</span>
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#C7A17A] bg-[#C7A17A]/10 px-2 py-0.5 rounded-full border border-[#C7A17A]/20">
                          <CheckCircle2 className="w-3 h-3" /> Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
                          <XCircle className="w-3 h-3" /> Inaktiv
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                  <span className="text-base font-bold text-[#C7A17A] whitespace-nowrap tabular-nums">
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
