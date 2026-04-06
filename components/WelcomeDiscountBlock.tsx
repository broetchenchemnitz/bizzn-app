'use client'

import { useState, useTransition } from 'react'
import { updateWelcomeDiscount } from '@/app/actions/project'
import { Tag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Props = {
  projectId: string
  initialEnabled: boolean
  initialPct: number
}

export default function WelcomeDiscountBlock({ projectId, initialEnabled, initialPct }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [pct, setPct] = useState(initialPct)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = () => {
    setStatus('idle')
    setErrorMsg(null)
    startTransition(async () => {
      const result = await updateWelcomeDiscount(projectId, enabled, pct)
      if ('error' in result) {
        setStatus('error')
        setErrorMsg(result.error ?? 'Unbekannter Fehler.')
      } else {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Willkommensrabatt aktivieren</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Erstbesteller erhalten automatisch {pct} % Rabatt auf ihre erste Bestellung.
          </p>
        </div>
        <button
          id="welcome-discount-toggle"
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A17A] ${
            enabled
              ? 'bg-[#C7A17A] border-[#B58E62]'
              : 'bg-[#333333] border-[#444444]'
          }`}
          aria-pressed={enabled}
          aria-label="Willkommensrabatt umschalten"
        >
          <span
            className={`inline-block h-4 w-4 translate-y-0.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Slider — nur aktiv wenn enabled */}
      <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="discount-slider" className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Rabatt-Höhe
          </label>
          <span className="text-base font-extrabold text-[#C7A17A] tabular-nums">
            {pct} %
          </span>
        </div>
        <input
          id="discount-slider"
          type="range"
          min={1}
          max={50}
          step={1}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#C7A17A] bg-[#333333]"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>1 %</span>
          <span>25 %</span>
          <span>50 %</span>
        </div>
        {/* Preview */}
        <div className="mt-4 bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 flex items-start gap-3">
          <Tag className="w-4 h-4 text-[#C7A17A] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">
              Vorschau: Erstbesteller sehen im Warenkorb
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              🎉 <span className="font-bold text-[#C7A17A]">{pct} % Willkommensrabatt</span> wird automatisch auf deine erste Bestellung angewendet!
            </p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Gespeichert!
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      {/* Save Button */}
      <button
        id="welcome-discount-save"
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center gap-2 bg-[#C7A17A] hover:bg-[#B58E62] disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isPending ? 'Wird gespeichert…' : 'Rabatt speichern'}
      </button>
    </div>
  )
}
