'use client'

import { useState, useTransition } from 'react'
import { Timer, Check, AlertCircle, Info } from 'lucide-react'
import { updatePickupSlotsEnabled, updatePickupSlotsSettings } from '@/app/actions/project'

interface Props {
  projectId: string
  initialEnabled: boolean
  initialPrepTime: number
  initialInterval: number
  initialMaxPerSlot: number | null
}

const INTERVAL_OPTIONS = [
  { value: 10, label: '10 Minuten' },
  { value: 15, label: '15 Minuten' },
  { value: 20, label: '20 Minuten' },
  { value: 30, label: '30 Minuten' },
]

export default function PickupSlotsBlock({
  projectId,
  initialEnabled,
  initialPrepTime,
  initialInterval,
  initialMaxPerSlot,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [prepTime, setPrepTime] = useState(initialPrepTime)
  const [interval, setInterval_] = useState(initialInterval)
  const [maxPerSlot, setMaxPerSlot] = useState<string>(
    initialMaxPerSlot !== null ? String(initialMaxPerSlot) : ''
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const showFeedback = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 3000)
  }

  // Toggle Feature-Flag
  const handleToggle = () => {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const res = await updatePickupSlotsEnabled(projectId, next)
      if (res.error) {
        setEnabled(!next)
        showFeedback('err', res.error)
      }
    })
  }

  // Settings speichern
  const handleSave = () => {
    startTransition(async () => {
      const res = await updatePickupSlotsSettings(projectId, {
        prep_time_minutes: prepTime,
        slot_interval_minutes: interval,
        max_orders_per_slot: maxPerSlot === '' ? null : parseInt(maxPerSlot),
      })
      if (res.error) {
        showFeedback('err', res.error)
      } else {
        showFeedback('ok', 'Einstellungen gespeichert ✓')
      }
    })
  }

  return (
    <div className="space-y-5">

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Abholzeit-Auswahl anbieten</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Kunden wählen beim Bestellen eine Abholzeit aus deinen Öffnungszeiten.
          </p>
        </div>
        <button
          id={`pickup-slots-toggle-${projectId}`}
          onClick={handleToggle}
          disabled={isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            enabled ? 'bg-[#C7A17A]' : 'bg-[#333333]'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          feedback.type === 'ok'
            ? 'bg-green-900/30 border border-green-800/40 text-green-400'
            : 'bg-red-900/30 border border-red-800/40 text-red-400'
        }`}>
          {feedback.type === 'ok' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {feedback.msg}
        </div>
      )}

      {/* Hinweis auf Öffnungszeiten */}
      {enabled && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#1A1A1A] border border-[#2a2a2a]">
          <Info className="w-3.5 h-3.5 text-[#C7A17A] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Die Zeitslots werden automatisch aus deinen{' '}
            <span className="text-[#C7A17A] font-semibold">Öffnungszeiten</span> generiert.
            Stelle diese zuerst unter <em>Profil</em> ein.
          </p>
        </div>
      )}

      {/* Einstellungen (nur wenn enabled) */}
      {enabled && (
        <div className="space-y-4 pt-1">

          {/* Vorlaufzeit */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              ⏱ Vorlaufzeit (Zubereitungszeit)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={90}
                step={5}
                value={prepTime}
                onChange={e => setPrepTime(parseInt(e.target.value))}
                className="flex-1 accent-[#C7A17A]"
              />
              <span className="text-[#C7A17A] font-bold text-sm w-20 text-right">
                {prepTime} Min
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Der früheste buchbare Slot ist immer jetzt + {prepTime} Minuten.
            </p>
          </div>

          {/* Slot-Raster */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              🗓 Slot-Raster
            </label>
            <div className="grid grid-cols-4 gap-2">
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setInterval_(opt.value)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                    interval === opt.value
                      ? 'bg-[#C7A17A]/20 border-[#C7A17A] text-[#C7A17A]'
                      : 'bg-[#1A1A1A] border-[#333] text-gray-500 hover:border-[#555]'
                  }`}
                >
                  {opt.value} Min
                </button>
              ))}
            </div>
          </div>

          {/* Max. pro Slot */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              🔢 Max. Bestellungen pro Slot (optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={99}
                value={maxPerSlot}
                onChange={e => setMaxPerSlot(e.target.value)}
                placeholder="∞ Unbegrenzt"
                className="w-40 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#C7A17A]/60 placeholder-gray-600"
              />
              <p className="text-xs text-gray-600">
                Leer lassen = unbegrenzt
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl bg-[#111] border border-[#222]">
            <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Vorschau (z. B. bei Öffnungszeit 11:00–22:00)</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 6 }, (_, i) => {
                const startMin = 660 + prepTime  // 11:00 + prepTime
                const slotMin = Math.ceil(startMin / interval) * interval + i * interval
                const h = Math.floor(slotMin / 60)
                const m = slotMin % 60
                if (h >= 22) return null
                const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
                return (
                  <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                    i === 0
                      ? 'bg-[#C7A17A]/15 border-[#C7A17A]/40 text-[#C7A17A]'
                      : 'bg-[#1A1A1A] border-[#2a2a2a] text-gray-400'
                  }`}>{t}</span>
                )
              })}
              <span className="px-2 py-1 text-gray-600 text-xs">…</span>
            </div>
          </div>

          {/* Speichern */}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#C7A17A] text-[#111] font-bold text-sm hover:bg-[#d4a870] transition-colors disabled:opacity-60"
          >
            <Timer className="w-4 h-4" />
            {isPending ? 'Speichert…' : 'Einstellungen speichern'}
          </button>
        </div>
      )}
    </div>
  )
}
