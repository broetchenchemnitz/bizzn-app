'use client'

import { useTransition, useState } from 'react'
import { createDish } from '@/app/lib/actions/dishActions'

interface Props {
  categoryId: string
}

export default function DishForm({ categoryId }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await createDish(categoryId, formData)
        setSuccess(true)
        ;(e.target as HTMLFormElement).reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="z.B. Margherita"
          className="w-full bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-zinc-100 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all placeholder:text-zinc-600 shadow-inner"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Beschreibung
        </label>
        <textarea
          name="description"
          placeholder="Schmackhafte Beschreibung (optional)"
          rows={3}
          className="w-full bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-zinc-100 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all placeholder:text-zinc-600 shadow-inner resize-y"
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Preis (€) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          name="price"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          className="w-full bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-zinc-100 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all placeholder:text-zinc-600 shadow-inner font-mono"
        />
      </div>

      {/* Feedback */}
      {error && (
        <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800/60 px-4 py-2.5 rounded-xl">
          ⚠️ {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-[#77CC00] bg-green-950/30 border border-[#77CC00]/20 px-4 py-2.5 rounded-xl">
          ✓ Gericht erfolgreich hinzugefügt.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-[#77CC00] text-black text-sm uppercase tracking-wide font-bold py-4 px-6 rounded-xl hover:bg-[#88e600] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(119,204,0,0.2)] hover:shadow-[0_0_30px_rgba(119,204,0,0.4)] disabled:opacity-50 self-start"
      >
        {pending ? 'Speichert…' : '+ Gericht hinzufügen'}
      </button>
    </form>
  )
}
