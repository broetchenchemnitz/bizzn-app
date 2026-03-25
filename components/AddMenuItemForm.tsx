"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Euro, ToggleLeft, ToggleRight } from 'lucide-react'
import { createMenuItem } from '@/app/actions/menu'

interface AddMenuItemFormProps {
  categoryId: string
}

export default function AddMenuItemForm({ categoryId }: AddMenuItemFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priceEur, setPriceEur] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !priceEur) return

    const parsedPrice = parseFloat(priceEur.replace(',', '.'))
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Bitte einen gültigen Preis eingeben.')
      return
    }

    const priceCents = Math.round(parsedPrice * 100)

    setIsLoading(true)
    setError(null)

    const result = await createMenuItem(categoryId, {
      name,
      description,
      price: priceCents,
      is_active: isActive,
    })

    setIsLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setName('')
      setDescription('')
      setPriceEur('')
      setIsActive(true)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`item-name-${categoryId}`} className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Name *
          </label>
          <input
            id={`item-name-${categoryId}`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Wiener Schnitzel"
            required
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#77CC00] focus:ring-2 focus:ring-[#77CC00]/20 transition-all"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor={`item-price-${categoryId}`} className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Preis (€) *
          </label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id={`item-price-${categoryId}`}
              type="text"
              value={priceEur}
              onChange={(e) => setPriceEur(e.target.value)}
              placeholder="12.90"
              required
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#77CC00] focus:ring-2 focus:ring-[#77CC00]/20 transition-all"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={`item-desc-${categoryId}`} className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Beschreibung
        </label>
        <textarea
          id={`item-desc-${categoryId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kurze Beschreibung des Gerichts…"
          rows={2}
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#77CC00] focus:ring-2 focus:ring-[#77CC00]/20 transition-all resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none"
        >
          {isActive
            ? <ToggleRight className="w-6 h-6 text-[#77CC00]" />
            : <ToggleLeft className="w-6 h-6 text-gray-400" />}
          {isActive ? 'Aktiv (auf Karte sichtbar)' : 'Inaktiv (ausgeblendet)'}
        </button>

        <button
          type="submit"
          disabled={isLoading || !name.trim() || !priceEur}
          className="flex items-center gap-2 bg-[#77CC00] hover:bg-[#66b300] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Speise hinzufügen
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
      )}
    </form>
  )
}
