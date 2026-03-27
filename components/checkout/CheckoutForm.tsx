'use client'

/**
 * CheckoutForm — Customer details form
 * Collects: name, delivery address, notes, order type (delivery/pickup)
 */

import { useState } from 'react'
import { MapPin, Truck, Store, AlertCircle } from 'lucide-react'

interface CheckoutFormProps {
  onSubmit: (data: {
    customerName: string
    deliveryAddress: string
    notes: string
    orderType: 'delivery' | 'pickup'
  }) => void
  isSubmitting: boolean
  error: string | null
}

export default function CheckoutForm({ onSubmit, isSubmitting, error }: CheckoutFormProps) {
  const [customerName, setCustomerName] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) return
    onSubmit({ customerName, deliveryAddress, notes, orderType })
  }

  const inputClass =
    'w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#77CC00]/60 transition-colors'
  const labelClass = 'block text-xs font-medium tracking-wide text-gray-400 mb-1.5'

  return (
    <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-6">
      <h2 className="text-base font-extrabold tracking-tighter text-white mb-5">
        Deine Angaben
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Order type toggle */}
        <div>
          <p className={labelClass}>Bestellart</p>
          <div className="grid grid-cols-2 gap-2">
            {(['delivery', 'pickup'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                  orderType === type
                    ? 'bg-[#77CC00] text-[#1A1A1A] border-[#77CC00]'
                    : 'bg-[#1A1A1A] text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                {type === 'delivery' ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                {type === 'delivery' ? 'Lieferung' : 'Abholung'}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className={labelClass} htmlFor="customerName">Name *</label>
          <input
            id="customerName"
            type="text"
            required
            placeholder="Dein Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Address — only for delivery */}
        {orderType === 'delivery' && (
          <div>
            <label className={labelClass} htmlFor="deliveryAddress">
              <MapPin className="inline w-3 h-3 mr-1 text-[#77CC00]" />
              Lieferadresse *
            </label>
            <input
              id="deliveryAddress"
              type="text"
              required
              placeholder="Straße, Hausnummer, PLZ Ort"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={labelClass} htmlFor="notes">Anmerkungen</label>
          <textarea
            id="notes"
            placeholder="Allergien, Sonderwünsche..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !customerName.trim()}
          className="btn-glow-primary w-full bg-[#77CC00] text-[#1A1A1A] font-extrabold rounded-full py-4 text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
        >
          {isSubmitting ? 'Bitte warten...' : 'Jetzt bestellen & zahlen →'}
        </button>
      </form>
    </div>
  )
}
