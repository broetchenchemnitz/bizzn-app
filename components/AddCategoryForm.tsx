"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { createMenuCategory } from '@/app/actions/menu'

interface AddCategoryFormProps {
  projectId: string
}

export default function AddCategoryForm({ projectId }: AddCategoryFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError(null)

    const result = await createMenuCategory(projectId, name)

    setIsLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setName('')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Vorspeisen, Hauptgericht, Getränke…"
          className="flex-1 px-4 py-3 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-xl outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/30 transition-all shadow-inner"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all duration-300 disabled:opacity-50 shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 active:scale-[0.98] whitespace-nowrap"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Hinzufügen
        </button>
      </div>
      {error && (
        <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800/60 px-4 py-2.5 rounded-xl shadow-inner flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          {error}
        </p>
      )}
    </form>
  )
}
