'use client'

import { useState, useTransition } from 'react'
import { updateDeliverySettings } from '@/app/actions/project'
import { Truck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Props = {
  projectId: string
  initialEnabled: boolean
  initialFeeCents: number
  initialMinOrderCents: number
  initialFreeAboveCents: number
}

function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function eurToCents(val: string): number {
  const num = parseFloat(val.replace(',', '.'))
  if (isNaN(num) || num < 0) return 0
  return Math.round(num * 100)
}

export default function DeliverySettingsBlock({
  projectId,
  initialEnabled,
  initialFeeCents,
  initialMinOrderCents,
  initialFreeAboveCents,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [feeEur, setFeeEur] = useState(initialFeeCents > 0 ? centsToEur(initialFeeCents) : '')
  const [minOrderEur, setMinOrderEur] = useState(
    initialMinOrderCents > 0 ? centsToEur(initialMinOrderCents) : ''
  )
  const [freeAboveEur, setFreeAboveEur] = useState(
    initialFreeAboveCents > 0 ? centsToEur(initialFreeAboveCents) : ''
  )
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = () => {
    setStatus('idle')
    setErrorMsg(null)
    const feeCents = eurToCents(feeEur || '0')
    const minOrderCents = eurToCents(minOrderEur || '0')
    const freeAboveCents = eurToCents(freeAboveEur || '0')
    startTransition(async () => {
      const result = await updateDeliverySettings(projectId, {
        enabled,
        feeCents,
        minOrderCents,
        freeAboveCents,
      })
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
      {/* Toggle Lieferung aktiv */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Lieferung anbieten</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Kunden können im Warenkorb &quot;Lieferung&quot; wählen.
          </p>
        </div>
        <button
          id="delivery-enabled-toggle"
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A17A] ${
            enabled
              ? 'bg-[#C7A17A] border-[#B58E62]'
              : 'bg-[#333333] border-[#444444]'
          }`}
          aria-pressed={enabled}
          aria-label="Lieferung umschalten"
        >
          <span
            className={`inline-block h-4 w-4 translate-y-0.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Felder — nur aktiv wenn enabled */}
        <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
          <div className="grid grid-cols-2 gap-4">
            {/* Liefergebühr */}
            <div>
              <label
                htmlFor="delivery-fee"
                className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
              >
                Liefergebühr (€)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">€</div>
                <input
                  id="delivery-fee"
                  type="number"
                  min="0"
                  max="20"
                  step="0.10"
                  value={feeEur}
                  onChange={(e) => setFeeEur(e.target.value)}
                  placeholder="2,50"
                  className="w-full pl-7 pr-3 py-2.5 text-sm bg-[#1A1A1A] border border-[#333333] text-white rounded-xl outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition placeholder:text-gray-600"
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">0 = kostenlose Lieferung</p>
            </div>

            {/* Mindestbestellwert */}
            <div>
              <label
                htmlFor="min-order"
                className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
              >
                Mindestbestellwert (€)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">€</div>
                <input
                  id="min-order"
                  type="number"
                  min="0"
                  max="100"
                  step="0.50"
                  value={minOrderEur}
                  onChange={(e) => setMinOrderEur(e.target.value)}
                  placeholder="15,00"
                  className="w-full pl-7 pr-3 py-2.5 text-sm bg-[#1A1A1A] border border-[#333333] text-white rounded-xl outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition placeholder:text-gray-600"
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">0 = kein Mindestbestellwert</p>
            </div>
          </div>

          {/* Gratislieferung ab */}
          <div className="mt-4">
            <label
              htmlFor="free-above"
              className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
            >
              🎁 Gratislieferung ab (€)
            </label>
            <div className="relative max-w-[180px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">€</div>
              <input
                id="free-above"
                type="number"
                min="0"
                max="100"
                step="0.50"
                value={freeAboveEur}
                onChange={(e) => setFreeAboveEur(e.target.value)}
                placeholder="30,00"
                className="w-full pl-7 pr-3 py-2.5 text-sm bg-[#1A1A1A] border border-[#333333] text-white rounded-xl outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition placeholder:text-gray-600"
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">0 = kein Gratislieferungs-Schwellenwert</p>
          </div>

        {/* Vorschau */}
          {enabled && (
            <div className="mt-4 bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 flex items-start gap-3">
              <Truck className="w-4 h-4 text-[#C7A17A] mt-0.5 shrink-0" />
              <div className="text-xs text-gray-400 space-y-0.5">
                <p className="font-semibold text-white">Vorschau im Warenkorb</p>
                {feeEur && parseFloat(feeEur.replace(',', '.')) > 0 ? (
                  <p>🛵 Liefergebühr: <span className="text-[#C7A17A] font-bold">{parseFloat(feeEur.replace(',', '.')).toFixed(2).replace('.', ',')} €</span></p>
                ) : (
                  <p>🛵 <span className="text-green-400 font-bold">Kostenlose Lieferung</span></p>
                )}
                {freeAboveEur && parseFloat(freeAboveEur.replace(',', '.')) > 0 && (
                  <p>🎁 Gratislieferung ab: <span className="text-green-400 font-bold">{parseFloat(freeAboveEur.replace(',', '.')).toFixed(2).replace('.', ',')} €</span></p>
                )}
                {minOrderEur && parseFloat(minOrderEur.replace(',', '.')) > 0 && (
                  <p>Mindestbestellwert: <span className="text-white font-semibold">{parseFloat(minOrderEur.replace(',', '.')).toFixed(2).replace('.', ',')} €</span></p>
                )}
              </div>
            </div>
          )}
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
        id="delivery-settings-save"
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center gap-2 bg-[#C7A17A] hover:bg-[#B58E62] disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isPending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
      </button>
    </div>
  )
}
