'use client'

import { useState, useTransition } from 'react'
import { updateOnlinePaymentEnabled } from '@/app/actions/project'
import { CreditCard, Check, AlertCircle, ExternalLink, Loader2, ToggleLeft, ToggleRight, Zap } from 'lucide-react'

interface Props {
  projectId: string
  stripeAccountId: string | null
  stripeChargesEnabled: boolean | null
  stripePayoutsEnabled: boolean | null
  onlinePaymentEnabled: boolean | null
}

type ConnectStatus = 'not_connected' | 'pending' | 'active'

export default function StripePaymentBlock({
  projectId,
  stripeAccountId,
  stripeChargesEnabled,
  stripePayoutsEnabled,
  onlinePaymentEnabled,
}: Props) {
  const [enabled, setEnabled] = useState(onlinePaymentEnabled ?? false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const connectStatus: ConnectStatus = !stripeAccountId
    ? 'not_connected'
    : stripeChargesEnabled
    ? 'active'
    : 'pending'

  const handleToggle = () => {
    if (connectStatus !== 'active') return
    const next = !enabled
    setEnabled(next)
    setSaveMsg(null)

    startTransition(async () => {
      const res = await updateOnlinePaymentEnabled(projectId, next)
      setSaveMsg(res.error ? `❌ ${res.error}` : '✅ Gespeichert')
      setTimeout(() => setSaveMsg(null), 3000)
    })
  }

  return (
    <div className="space-y-6">

      {/* Status Banner */}
      {connectStatus === 'not_connected' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">Kein Stripe-Konto verbunden</p>
            <p className="text-xs text-yellow-400/70 mt-0.5">
              Verbinde deinen Stripe-Account, um Kartenzahlungen anzunehmen.
            </p>
          </div>
        </div>
      )}

      {connectStatus === 'pending' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/8 border border-blue-500/20">
          <Loader2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-300">Verifizierung ausstehend</p>
            <p className="text-xs text-blue-400/70 mt-0.5">
              Dein Stripe-Konto ist verbunden, aber noch nicht vollständig verifiziert.
              Öffne das Stripe-Dashboard und schließe das Onboarding ab.
            </p>
          </div>
        </div>
      )}

      {connectStatus === 'active' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/8 border border-green-500/20">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-300">Stripe aktiv & verifiziert</p>
            <p className="text-xs text-green-400/70 mt-0.5">
              Zahlungen aktiviert. Auszahlungen: {stripePayoutsEnabled ? '✅ aktiv' : '⏳ ausstehend'}
            </p>
          </div>
        </div>
      )}

      {/* Connect / Reconnect Button */}
      <div className="flex flex-col gap-3">
        <a
          href={`/api/stripe/connect?projectId=${projectId}`}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: connectStatus === 'active'
              ? 'rgba(255,255,255,0.04)'
              : 'linear-gradient(135deg, #635bff, #7c6fff)',
            border: connectStatus === 'active'
              ? '1px solid rgba(255,255,255,0.1)'
              : 'none',
            color: connectStatus === 'active' ? '#9ca3af' : '#fff',
          }}
        >
          <CreditCard className="w-4 h-4" />
          {connectStatus === 'not_connected'
            ? 'Mit Stripe verbinden'
            : connectStatus === 'pending'
            ? 'Stripe-Onboarding fortsetzen'
            : 'Stripe-Dashboard öffnen'}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>

        {/* Info-Link */}
        <p className="text-xs text-gray-500 text-center">
          Kein Stripe-Konto?{' '}
          <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-[#635bff] hover:underline">
            Kostenlos registrieren →
          </a>
        </p>
      </div>

      {/* Toggle: Online-Zahlung an/aus */}
      <div className={`p-4 rounded-xl border transition-all ${
        connectStatus === 'active'
          ? 'bg-white/3 border-white/8'
          : 'bg-white/1 border-white/5 opacity-50 pointer-events-none'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              enabled ? 'bg-[#C7A17A]/20' : 'bg-white/5'
            }`}>
              <Zap className={`w-4 h-4 ${enabled ? 'text-[#C7A17A]' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Online-Zahlung anbieten</p>
              <p className="text-xs text-gray-500">
                {enabled ? 'Kunden können mit Karte / Apple Pay bezahlen.' : 'Nur Barzahlung möglich.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={isPending || connectStatus !== 'active'}
            className="flex-shrink-0 transition-all"
            title={enabled ? 'Deaktivieren' : 'Aktivieren'}
          >
            {isPending ? (
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            ) : enabled ? (
              <ToggleRight className="w-8 h-8 text-[#C7A17A]" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {saveMsg && (
        <p className="text-sm text-center text-gray-300 animate-pulse">{saveMsg}</p>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-white/2 border border-white/5">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-gray-400 font-semibold">So funktioniert es:</span>{' '}
          Bizzn leitet Zahlungen direkt auf dein Stripe-Konto weiter (Stripe Connect).
          Barzahlung bleibt immer als Alternative verfügbar.
          Stripe erhebt Transaktionsgebühren (~1,5 % + 0,25 €).
          Bizzn erhebt keine zusätzliche Provision.
        </p>
      </div>
    </div>
  )
}
