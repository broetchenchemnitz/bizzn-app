"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Loader2, Check } from 'lucide-react'
import { updateUserName } from '@/app/actions/user'

interface ProfileFormProps {
  initialName: string
  email: string
}

export default function ProfileForm({ initialName, email }: ProfileFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSaved(false)

    const result = await updateUserName(name)

    setIsSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">Die E-Mail-Adresse kann nicht geändert werden.</p>
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
          Anzeigename
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="full_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein vollständiger Name"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isSaving || name.trim() === initialName}
          className="flex items-center gap-2 bg-brand hover:bg-[#66b300] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSaving ? 'Speichern...' : 'Speichern'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Gespeichert!
          </span>
        )}
      </div>
    </form>
  )
}
