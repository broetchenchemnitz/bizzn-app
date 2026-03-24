"use client"

import { useState } from 'react'
import { PlusCircle, Loader2 } from 'lucide-react'

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="flex items-center gap-2 bg-brand hover:bg-[#66b300] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
      {loading ? 'Processing...' : 'New Project'}
    </button>
  )
}
