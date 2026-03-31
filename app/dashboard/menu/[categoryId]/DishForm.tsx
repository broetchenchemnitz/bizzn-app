'use client'

import { useTransition, useState, useRef } from 'react'
import { createDish } from '@/app/lib/actions/dishActions'

interface Props {
  categoryId: string
}

export default function DishForm({ categoryId }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await createDish(categoryId, formData)
        setSuccess(true)
        formRef.current?.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="z.B. Margherita"
          className="w-full bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-4 py-3 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Beschreibung
        </label>
        <textarea
          name="description"
          rows={3}
          placeholder="Zutaten und Besonderheiten (optional)"
          className="w-full bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-4 py-3 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Preis (€) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          name="price"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          className="w-full bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-4 py-3 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all font-mono"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 px-4 py-2.5 rounded-lg">
          ⚠️ {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-[#77CC00] bg-[#77CC00]/10 border border-[#77CC00]/20 px-4 py-2.5 rounded-lg">
          ✓ Speise erfolgreich hinzugefügt.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-[#77CC00] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#88e600] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {pending ? 'Speichert…' : '+ Speise hinzufügen'}
      </button>
    </form>
  )
}
