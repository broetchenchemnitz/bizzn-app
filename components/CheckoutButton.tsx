"use client"

import { useState } from 'react'
import { PlusCircle, Loader2 } from 'lucide-react'

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleCheckout = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)

      const res = await fetch('/api/checkout', {
        method: 'POST',
        credentials: 'include', // explicitly include cookies for same-origin
      })

      let data: { url?: string; error?: string } = {}
      try {
        data = await res.json()
      } catch {
        throw new Error(`Server returned ${res.status} with non-JSON body`)
      }

      if (!res.ok || !data.url) {
        throw new Error(data.error || `Request failed with status ${res.status}`)
      }

      window.location.href = data.url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMsg(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="flex items-center gap-2 bg-brand hover:bg-[#66b300] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
        {loading ? 'Processing...' : 'New Project'}
      </button>
      {errorMsg && (
        <p className="text-xs text-red-500 max-w-xs text-right">{errorMsg}</p>
      )}
    </div>
  )
}
