'use client'

import { useState } from 'react'
import { Loader2, Check, AlertCircle, Euro, Calendar } from 'lucide-react'

interface Project {
  id: string
  name: string
  status: string
  custom_monthly_price_cents?: number | null
  trial_ends_at?: string | null
}

export function ProjectPricingRow({ project }: { project: Project }) {
  const [price, setPrice] = useState<string>(
    project.custom_monthly_price_cents !== undefined && project.custom_monthly_price_cents !== null
      ? String(project.custom_monthly_price_cents / 100)
      : ''
  )
  const [trialDate, setTrialDate] = useState(
    project.trial_ends_at ? project.trial_ends_at.split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      // customPriceCents: '' = Standard, '0' = gratis, Zahl = custom
      const customPriceCents = price === '' ? null : Math.round(parseFloat(price) * 100)
      const trialEndsAt = trialDate ? new Date(trialDate + 'T23:59:59Z').toISOString() : null

      const res = await fetch('/api/superadmin/set-project-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          customPriceCents,
          trialEndsAt,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler')

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      {/* Custom Preis */}
      <div>
        <label className="block text-[10px] text-gray-600 mb-1 flex items-center gap-1">
          <Euro className="w-3 h-3" />
          Preis (€) — leer = Standard 99€
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="99 (Default)"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white w-32 focus:outline-none focus:border-[#E8B86D]/40"
        />
        {price === '0' && (
          <p className="text-[10px] text-emerald-400 mt-0.5">✓ Gratismonat — kein Stripe nötig</p>
        )}
      </div>

      {/* Trial bis */}
      <div>
        <label className="block text-[10px] text-gray-600 mb-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Trial bis (optional)
        </label>
        <input
          type="date"
          value={trialDate}
          onChange={(e) => setTrialDate(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white w-36 focus:outline-none focus:border-[#E8B86D]/40"
        />
      </div>

      {/* Speichern */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-[#E8B86D]/10 hover:bg-[#E8B86D]/20 border border-[#E8B86D]/20 text-[#E8B86D] px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : saved ? (
          <Check className="w-3 h-3" />
        ) : null}
        {saving ? 'Speichern...' : saved ? 'Gespeichert!' : 'Speichern'}
      </button>

      {error && (
        <div className="flex items-center gap-1 text-red-400 text-[10px]">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  )
}
