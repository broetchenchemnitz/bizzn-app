'use client'

import { useState, useEffect, useTransition } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, UtensilsCrossed,
  PackageOpen, Pencil, ChevronRight, Loader2
} from 'lucide-react'
import { getCategory, getMenuItems, updateMenuItem } from '@/app/actions/menu'
import AddMenuItemForm from '@/components/AddMenuItemForm'
import EditMenuItemForm from '@/components/EditMenuItemForm'
import type { Database } from '@/types/supabase'

type MenuItem = Database['public']['Tables']['menu_items']['Row']
type MenuCategory = Database['public']['Tables']['menu_categories']['Row']

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export default function CategoryDetailPage() {
  const params = useParams<{ id: string; categoryId: string }>()

  const [category, setCategory] = useState<MenuCategory | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [openEditId, setOpenEditId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [isLoading, startLoadTransition] = useTransition()

  const handleToggleActive = async (item: MenuItem) => {
    if (togglingId) return // prevent double-tap
    setTogglingId(item.id)
    // Optimistic update — flip immediately
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
    const result = await updateMenuItem(item.id, { is_active: !item.is_active })
    if (result.error) {
      // Revert on error
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: item.is_active } : i))
    }
    setTogglingId(null)
  }

  useEffect(() => {
    startLoadTransition(async () => {
      const [catResult, itemsResult] = await Promise.all([
        getCategory(params.categoryId),
        getMenuItems(params.categoryId),
      ])
      if (catResult.data) setCategory(catResult.data)
      if (itemsResult.data) setItems(itemsResult.data)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.categoryId])

  const handleEditClose = () => {
    setOpenEditId(null)
    // Refetch items after edit
    startLoadTransition(async () => {
      const result = await getMenuItems(params.categoryId)
      if (result.data) setItems(result.data)
    })
  }

  if (isLoading && !category) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C7A17A] animate-spin" />
      </div>
    )
  }

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
              <h1 className="text-xl font-bold text-white">{category?.name ?? '…'}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Speisekarte
                {category && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 inline mx-1" />
                )}
                {category?.name}
              </p>
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
              {items.length} gesamt
            </span>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-gray-700 rounded-xl">
              <PackageOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Noch keine Speisen angelegt.</p>
              <p className="text-sm text-gray-500 mt-1">Füge deine erste Speise oben hinzu.</p>
            </div>
          ) : (
            <ul className="space-y-1 divide-y divide-gray-800/60">
              {items.map((item) => (
                <li key={item.id}>
                  {/* Item row */}
                  <div className="py-3 flex items-center justify-between gap-4 group rounded-lg px-2 hover:bg-[#C7A17A]/5 transition-colors">
                    {/* Thumbnail */}
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold transition-colors ${item.is_active ? 'text-white group-hover:text-[#C7A17A]' : 'text-gray-500'}`}>
                          {item.name}
                        </span>
                      </div>
                      {item.description && (
                        <p className={`text-sm mt-0.5 truncate ${item.is_active ? 'text-gray-400' : 'text-gray-600'}`}>{item.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-base font-bold tabular-nums ${item.is_active ? 'text-[#C7A17A]' : 'text-gray-600'}`}>
                        {formatPrice(item.price)}
                      </span>

                      {/* Prominent ON/OFF toggle switch */}
                      <button
                        id={`item-switch-${item.id}`}
                        type="button"
                        role="switch"
                        aria-checked={item.is_active}
                        aria-label={item.is_active ? `${item.name} deaktivieren` : `${item.name} aktivieren`}
                        onClick={() => handleToggleActive(item)}
                        disabled={togglingId === item.id}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A17A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#242424] disabled:opacity-50 disabled:cursor-not-allowed ${
                          item.is_active ? 'bg-[#C7A17A] shadow-[0_0_10px_rgba(199,161,122,0.3)]' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${
                            item.is_active ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        >
                          {togglingId === item.id && (
                            <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                          )}
                        </span>
                      </button>

                      <button
                        id={`item-edit-toggle-${item.id}`}
                        type="button"
                        onClick={() => setOpenEditId(openEditId === item.id ? null : item.id)}
                        className={`p-1.5 rounded-lg transition-all ${
                          openEditId === item.id
                            ? 'text-[#C7A17A] bg-[#C7A17A]/15'
                            : 'text-gray-600 hover:text-[#C7A17A] hover:bg-[#C7A17A]/10 opacity-0 group-hover:opacity-100'
                        }`}
                        aria-label={`${item.name} bearbeiten`}
                        aria-expanded={openEditId === item.id}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {openEditId === item.id && (
                    <EditMenuItemForm
                      item={item}
                      onClose={handleEditClose}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
