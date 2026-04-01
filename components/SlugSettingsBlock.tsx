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
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
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

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-4 h-4 text-[#C7A17A]" />
        <span className="text-sm font-semibold text-white">Storefront Web-Adresse</span>
        {savedSlug && (
          <a
            href={`https://${savedSlug}.bizzn.de`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-[#C7A17A] hover:underline font-mono"
          >
            {savedSlug}.bizzn.de
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Single-line inline input group */}
      <div className="flex items-stretch h-11 rounded-xl border border-[#333333] bg-[#1A1A1A] focus-within:ring-1 focus-within:ring-[#C7A17A] focus-within:border-[#C7A17A] transition-all relative">
        <div className="flex items-stretch w-full overflow-hidden rounded-xl">
          {/* Fixed prefix */}
        <span className="flex items-center pl-3.5 pr-2 text-sm text-gray-600 bg-[#242424] border-r border-[#333333] shrink-0 select-none font-mono">
          bizzn.de/
        </span>
        {/* Slug input */}
        <input
          type="text"
          value={slug}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="dein-restaurant"
          className="flex-1 px-3 text-sm text-white bg-transparent outline-none font-mono placeholder:text-gray-700"
          disabled={isPending}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        />
        {/* Inline save button */}
        <button
          onClick={handleSave}
          disabled={isPending || !isDirty || !slug}
          className="px-4 bg-[#C7A17A] hover:bg-[#B58E62] disabled:opacity-30 text-black text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 border-l border-[#9A7450]"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : success ? (
            <><Check className="w-3.5 h-3.5" /> Gespeichert</>
          ) : (
            'Speichern'
          )}
        </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="text-xs text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-1.5">
          {error}
        </p>
      )}
      {!error && (
        <p className="text-[11px] text-gray-700">
          Nur Kleinbuchstaben, Zahlen und Bindestriche · min. 3 Zeichen
        </p>
      )}
    </div>
  )
}
