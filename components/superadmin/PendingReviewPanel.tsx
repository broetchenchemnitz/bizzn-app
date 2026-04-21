'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react'
import { approveProject, rejectProject } from '@/app/actions/review'

interface PendingProject {
  id: string
  name: string
  city: string | null
  cuisine_type: string | null
  address: string | null
  created_at: string
  ownerEmail: string
  menuItemCount?: number
}

const PRICE_PRESETS = [
  { label: '0 € (Kostenlos)', value: 0 },
  { label: '49 €/Monat', value: 4900 },
  { label: '99 €/Monat', value: 9900 },
  { label: 'Individuell', value: -1 },
]

export function PendingReviewPanel({ projects }: { projects: PendingProject[] }) {
  if (projects.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-6 py-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-400">
            {projects.length} Restaurant{projects.length !== 1 ? 's' : ''} warte{projects.length === 1 ? 't' : 'n'} auf Prüfung
          </p>
          <p className="text-xs text-amber-400/60 mt-0.5">Prüfe und gib die Restaurants frei, damit sie online gehen können.</p>
        </div>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <ReviewCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

function ReviewCard({ project }: { project: PendingProject }) {
  const [expanded, setExpanded] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Preis-State
  const [pricePreset, setPricePreset] = useState(0) // default index → 0€
  const [customPrice, setCustomPrice] = useState('')
  const [trialDate, setTrialDate] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const selectedPreset = PRICE_PRESETS[pricePreset]
  const priceCents = selectedPreset.value === -1
    ? Math.round(parseFloat(customPrice || '0') * 100)
    : selectedPreset.value

  const handleApprove = async () => {
    setError(null)
    setApproving(true)
    try {
      const result = await approveProject(project.id, {
        customPriceCents: priceCents,
        trialEndsAt: trialDate || null,
        note: null,
      })
      if (result.error) { setError(result.error); return }
      setDone(true)
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Bitte Begründung angeben'); return }
    setError(null)
    setRejecting(true)
    try {
      const result = await rejectProject(project.id, rejectReason.trim())
      if (result.error) { setError(result.error); return }
      setDone(true)
    } finally {
      setRejecting(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
        <Check className="w-4 h-4 flex-shrink-0" />
        {project.name} — Aktion abgeschlossen. Seite neu laden zum Aktualisieren.
      </div>
    )
  }

  return (
    <div className="bg-[#141414] border border-[#2a2218] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">
            ⏳
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{project.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {[project.cuisine_type, project.city].filter(Boolean).join(' · ')} · {project.ownerEmail}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            {new Date(project.created_at).toLocaleDateString('de-DE')}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-[#1f1f1f] px-5 py-5 space-y-5">
          {/* Restaurant Details */}
          {project.address && (
            <div className="text-sm text-gray-400">📍 {project.address}</div>
          )}

          {/* Preis festlegen */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Monatspreis</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {PRICE_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  onClick={() => setPricePreset(i)}
                  className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                    pricePreset === i
                      ? 'bg-[#E8B86D]/15 border-[#E8B86D]/40 text-[#E8B86D]'
                      : 'bg-white/3 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {selectedPreset.value === -1 && (
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Betrag in Euro (z.B. 69)"
                className="w-full bg-[#0E0E16] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#E8B86D]/40"
              />
            )}
          </div>

          {/* Trial-Datum */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Kostenlose Testphase bis (optional)</p>
            <input
              type="date"
              value={trialDate}
              onChange={(e) => setTrialDate(e.target.value)}
              className="bg-[#0E0E16] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8B86D]/40"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-800/30 rounded-lg text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Ablehnen-Formular */}
          {showReject && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Begründung (wird per E-Mail gesendet)</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="z.B. Bitte vollständige Adresse ergänzen..."
                className="w-full bg-[#0E0E16] border border-red-800/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleApprove}
              disabled={approving || rejecting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Freigeben
            </button>

            {showReject ? (
              <button
                onClick={handleReject}
                disabled={approving || rejecting}
                className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Ablehnung senden
              </button>
            ) : (
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-3 py-2 rounded-lg hover:bg-red-950/30 transition-colors"
              >
                <X className="w-4 h-4" />
                Ablehnen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
