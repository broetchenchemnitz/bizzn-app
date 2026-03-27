'use client'

/**
 * CheckoutPage — Bizzn.de
 * DNA: #1A1A1A base · #242424 cards · #77CC00 accent
 *
 * Responsibilities:
 * - Validate cart/session from Supabase
 * - Collect customer details (name, address, notes)
 * - Trigger Stripe PaymentIntent and redirect to confirmation
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary'
import type { CartItem } from '@/types/checkout'

interface CheckoutPageClientProps {
  projectId: string
  projectName: string
  slug: string
  initialCart: CartItem[]
}

export default function CheckoutPageClient({
  projectId,
  projectName,
  slug,
  initialCart,
}: CheckoutPageClientProps) {
  const router = useRouter()
  const supabase = getSupabase()

  const [cart] = useState<CartItem[]>(initialCart)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleCheckout = async (formData: {
    customerName: string
    deliveryAddress: string
    notes: string
    orderType: 'delivery' | 'pickup'
  }) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Validate session — ensure project is still active
      const { data: project, error: projectErr } = await supabase
        .from('projects')
        .select('id, name, stripe_charges_enabled')
        .eq('id', projectId)
        .single()

      if (projectErr || !project) throw new Error('Restaurant nicht verfügbar.')
      if (!project.stripe_charges_enabled) throw new Error('Zahlungen noch nicht aktiviert.')

      // 2. Create order in Supabase
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          project_id: projectId,
          customer_name: formData.customerName,
          delivery_address: formData.deliveryAddress,
          notes: formData.notes,
          order_type: formData.orderType,
          status: 'pending',
          payout_status: 'pending',
          total: subtotal,
        })
        .select('id')
        .single()

      if (orderErr || !order) throw new Error('Bestellung konnte nicht erstellt werden.')

      // 3. Insert order items
      const items = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(items)
      if (itemsErr) throw new Error('Bestellpositionen konnten nicht gespeichert werden.')

      // 4. Create Stripe PaymentIntent via server route
      const res = await fetch('/api/checkout/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: subtotal, projectId }),
      })

      if (!res.ok) {
        const { error: apiError } = await res.json()
        throw new Error(apiError ?? 'Zahlung konnte nicht initiiert werden.')
      }

      const { clientSecret } = await res.json()

      // 5. Redirect to payment confirmation with clientSecret
      router.push(`/${slug}/checkout/pay?secret=${clientSecret}&order=${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">
            Checkout
          </h1>
          <p className="text-gray-400 font-medium tracking-wide text-sm mt-1">
            {projectName} · Deine Bestellung
          </p>
        </div>

        {/* 2-column layout: form + summary */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Customer form — col-span-3 */}
          <div className="lg:col-span-3 min-w-0">
            <CheckoutForm
              onSubmit={handleCheckout}
              isSubmitting={isSubmitting}
              error={error}
            />
          </div>

          {/* Order summary — col-span-2 */}
          <div className="lg:col-span-2 min-w-0">
            <CheckoutOrderSummary cart={cart} subtotal={subtotal} />
          </div>

        </div>
      </div>
    </div>
  )
}
