"use client"

import { useState, useTransition } from 'react'
import { Globe, Loader2, Check, ExternalLink } from 'lucide-react'
import { updateProjectSlug } from '@/app/actions/project'

interface SlugSettingsBlockProps {
  projectId: string
  initialSlug: string | null
}

function sanitize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')       // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '') // strip invalid chars
    .replace(/^-+|-+$/g, '')    // trim leading/trailing hyphens
}

export default function SlugSettingsBlock({ projectId, initialSlug }: SlugSettingsBlockProps) {
  const [slug, setSlug] = useState(initialSlug ?? '')
  const [savedSlug, setSavedSlug] = useState(initialSlug ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isDirty = slug !== savedSlug

  const handleChange = (raw: string) => {
    setError(null)
    setSuccess(false)
    setSlug(sanitize(raw))
  }

  const handleSave = () => {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateProjectSlug(projectId, slug)
      if (result.error) {
        setError(result.error)
      } else {
        setSavedSlug(result.slug ?? slug)
        setSuccess(true)
      }
    })
  }

  const previewUrl = slug ? `${slug}.bizzn.de` : 'dein-name.bizzn.de'

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#F0FBD8] flex items-center justify-center">
          <Globe className="w-5 h-5 text-[#77CC00]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Storefront Web-Adresse</h2>
          <p className="text-xs text-gray-500">Deine öffentliche Bestell-URL für Kunden</p>
        </div>
      </div>

      {/* Input row */}
      <div className="flex items-stretch gap-2">
        <div className="flex-1 flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#77CC00] focus-within:border-[#77CC00] transition-all bg-white">
          <span className="pl-4 pr-1 text-sm text-gray-400 shrink-0 select-none">bizzn.de/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="dein-restaurant"
            className="flex-1 py-3 pr-4 text-sm text-gray-900 bg-transparent outline-none"
            disabled={isPending}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || !isDirty || !slug}
          className="px-5 py-3 bg-[#77CC00] hover:bg-[#66b300] disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0"
        >
          {isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : success
            ? <Check className="w-4 h-4" />
            : 'Speichern'
          }
        </button>
      </div>

      {/* Live URL preview */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-400">Vorschau:</span>
        {savedSlug ? (
          <a
            href={`https://${savedSlug}.bizzn.de`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[#77CC00] hover:underline flex items-center gap-1"
          >
            {previewUrl}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs font-mono text-gray-400">{previewUrl}</span>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm text-[#4a8500] bg-[#F0FBD8] border border-[#77CC00]/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <Check className="w-4 h-4" />
          Web-Adresse erfolgreich gespeichert.
        </p>
      )}

      {/* Format hint */}
      <p className="mt-3 text-xs text-gray-400">
        Nur Kleinbuchstaben, Zahlen und Bindestriche · Mindestens 3 Zeichen · z. B. <span className="font-mono">mein-restaurant</span>
      </p>
    </div>
  )
}
