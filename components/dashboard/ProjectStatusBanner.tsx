'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle, Clock, Power, PowerOff, CreditCard, ExternalLink } from 'lucide-react'
import { goOnline, goOffline, goOnlinePaid } from '@/app/actions/review'

interface Project {
  id: string
  name: string
  status: string
  slug: string | null
  custom_monthly_price_cents: number | null
  trial_ends_at: string | null
  live_since: string | null
}

export function ProjectStatusBanner({ project }: { project: Project }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState(project.status)

  const price = project.custom_monthly_price_cents
  const isFree = price === 0
  const isTrial = project.trial_ends_at && new Date(project.trial_ends_at) > new Date()
  const canGoOnlineDirectly = isFree || isTrial || localStatus === 'inactive'

  const handleGoOnline = () => {
    setError(null)
    startTransition(async () => {
      if (canGoOnlineDirectly || localStatus === 'inactive') {
        const result = await goOnline(project.id)
        if (result.error) { setError(result.error); return }
        setLocalStatus('active')
      } else {
        // Paid → Stripe
        const result = await goOnlinePaid(project.id)
        if (result.error) { setError(result.error); return }
        if (result.url) window.location.href = result.url
      }
    })
  }

  const handleGoOffline = () => {
    setError(null)
    startTransition(async () => {
      const result = await goOffline(project.id)
      if (result.error) { setError(result.error); return }
      setLocalStatus('inactive')
    })
  }

  if (localStatus === 'active') {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-emerald-400">Online — Kunden können jetzt bestellen</div>
            {project.live_since && (
              <div className="text-xs text-emerald-400/60 mt-0.5">
                Live seit {new Date(project.live_since).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {project.slug && (
            <a
              href={`/${project.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Storefront ansehen
            </a>
          )}
          <button
            onClick={handleGoOffline}
            disabled={isPending}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-medium px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PowerOff className="w-3.5 h-3.5" />}
            Offline gehen
          </button>
        </div>
      </div>
    )
  }

  if (localStatus === 'inactive') {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white/3 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-gray-300">Offline — dein Restaurant ist nicht sichtbar</div>
            <div className="text-xs text-gray-600 mt-0.5">Geh online wenn du bereit bist.</div>
          </div>
        </div>
        <button
          onClick={handleGoOnline}
          disabled={isPending}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          Wieder online gehen
        </button>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }

  if (localStatus === 'approved') {
    const priceDisplay = price != null
      ? price === 0 ? 'Kostenlos' : `${(price / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/Monat`
      : '99,00 €/Monat'

    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#E8B86D]/8 border border-[#E8B86D]/25 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E8B86D]/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-[#E8B86D]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">🎉 Freigegeben! Bereit zum Start.</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {isTrial
                ? `Kostenlose Testphase bis ${new Date(project.trial_ends_at!).toLocaleDateString('de-DE')}`
                : priceDisplay}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleGoOnline}
            disabled={isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-[#E8B86D] to-[#d4a55a] hover:from-[#d4a55a] hover:to-[#c09148] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#E8B86D]/20 disabled:opacity-50"
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : canGoOnlineDirectly ? <Power className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />
            }
            {isPending
              ? 'Wird verarbeitet…'
              : canGoOnlineDirectly ? 'Jetzt online gehen 🚀' : `Bezahlen & Online gehen — ${priceDisplay}`
            }
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    )
  }

  if (localStatus === 'pending_review') {
    return (
      <div className="flex items-center gap-4 p-5 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
        <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-400">In Prüfung</div>
          <div className="text-xs text-amber-400/60 mt-0.5">
            Wir prüfen dein Restaurant und melden uns per E-Mail — in der Regel innerhalb von 24 Stunden.
          </div>
        </div>
      </div>
    )
  }

  // Draft: zurück zum Wizard
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white/3 border border-white/10 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-600 flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-gray-300">Wizard nicht abgeschlossen</div>
          <div className="text-xs text-gray-600 mt-0.5">Schließe den Setup-Wizard ab um dein Restaurant einzureichen.</div>
        </div>
      </div>
      <a
        href={`/onboarding?project=${project.id}`}
        className="flex items-center gap-2 bg-[#E8B86D] hover:bg-[#d4a55a] text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
      >
        Wizard fortsetzen →
      </a>
    </div>
  )
}
