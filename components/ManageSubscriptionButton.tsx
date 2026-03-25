"use client"

import { useState } from 'react'
import { Settings, Loader2 } from 'lucide-react'

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleManageSubscription = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)

      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Fehler beim Erstellen der Portal-Session')
      }

      window.location.href = data.url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten'
      setErrorMsg(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <Settings className="w-4 h-4 text-gray-500" />}
        {loading ? 'Lädt...' : 'Abo verwalten'}
      </button>
      {errorMsg && (
        <p className="text-xs text-red-500 max-w-xs text-right">{errorMsg}</p>
      )}
    </div>
  )
}
