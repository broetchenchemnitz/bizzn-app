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
          className="flex-1 px-4 py-3 text-sm bg-[#1a1a1a] text-white placeholder-gray-600 border border-gray-700 rounded-xl outline-none focus:border-[#C7A17A] focus:ring-2 focus:ring-[#C7A17A]/20 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="flex items-center justify-center gap-2 bg-[#C7A17A] hover:bg-[#B58E62] active:scale-[0.98] text-black font-bold px-6 py-3 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Hinzufügen
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          {error}
        </p>
      )}
    </form>
  )
}
