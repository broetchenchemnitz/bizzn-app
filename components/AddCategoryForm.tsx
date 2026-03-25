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
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Vorspeisen, Hauptgericht, Getränke…"
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#77CC00] focus:ring-2 focus:ring-[#77CC00]/20 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="flex items-center gap-2 bg-[#77CC00] hover:bg-[#66b300] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Hinzufügen
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </form>
  )
}
