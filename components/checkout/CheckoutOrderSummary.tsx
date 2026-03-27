'use client'

/**
 * CheckoutOrderSummary — Cart line items and subtotal
 */

import type { CartItem } from '@/types/checkout'

interface CheckoutOrderSummaryProps {
  cart: CartItem[]
  subtotal: number
}

export default function CheckoutOrderSummary({ cart, subtotal }: CheckoutOrderSummaryProps) {
  return (
    <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-6 sticky top-[70px]">
      <h2 className="text-base font-extrabold tracking-tighter text-white mb-5">
        Deine Bestellung
      </h2>

      <div className="space-y-3">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#77CC00]/10 border border-[#77CC00]/30 text-[#77CC00] text-[10px] font-bold flex items-center justify-center">
                {item.quantity}
              </span>
              <span className="text-sm text-gray-300 truncate">{item.name}</span>
            </div>
            <span className="text-sm font-semibold text-white shrink-0">
              {((item.price * item.quantity) / 100).toFixed(2)} €
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-wide text-gray-400">Gesamt</span>
          <span className="text-xl font-extrabold text-[#77CC00] drop-shadow-[0_0_8px_rgba(119,204,0,0.5)]">
            {(subtotal / 100).toFixed(2)} €
          </span>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">inkl. MwSt. · zzgl. Liefergebühr</p>
      </div>
    </div>
  )
}
