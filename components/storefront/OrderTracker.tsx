"use client"

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ChefHat, Clock, CheckCircle2, Loader2, UtensilsCrossed, Bike } from 'lucide-react'
import type { Database } from '@/types/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderStatus = OrderRow['status']

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; color: string; bg: string; step: number }
> = {
  pending: {
    label: 'Bestellung eingegangen',
    icon: <Clock className="w-8 h-8" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    step: 1,
  },
  preparing: {
    label: 'In Zubereitung',
    icon: <UtensilsCrossed className="w-8 h-8" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    step: 2,
  },
  ready: {
    label: 'Bereit zur Abholung',
    icon: <CheckCircle2 className="w-8 h-8" />,
    color: 'text-[#77CC00]',
    bg: 'bg-[#F0FBD8] border-[#77CC00]/30',
    step: 3,
  },
  delivered: {
    label: 'Unterwegs zu dir',
    icon: <Bike className="w-8 h-8" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    step: 4,
  },
  cancelled: {
    label: 'Storniert',
    icon: <Clock className="w-8 h-8" />,
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    step: 0,
  },
}

const STEPS: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered']

interface Props {
  orderId: string
  domain: string
  initialOrder: OrderRow
}

export default function OrderTracker({ orderId, domain, initialOrder }: Props) {
  const [order, setOrder] = useState<OrderRow>(initialOrder)

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`order-tracker-${orderId}`)
      .on<OrderRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new as OrderRow)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orderId])

  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const currentStep = STEPS.indexOf(order.status)

  function formatEur(cents: number) {
    return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#77CC00] flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#1A1A1A] text-base leading-none">{domain}</p>
            <p className="text-xs text-gray-400">Bestellverfolgung · bizzn</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
        {/* Status card */}
        <div className={`rounded-2xl border p-6 flex flex-col items-center text-center gap-3 ${config.bg}`}>
          <div className={config.color}>
            {config.icon}
          </div>
          <h1 className={`text-2xl font-extrabold ${config.color}`}>{config.label}</h1>
          {order.status !== 'cancelled' && (
            <div className="flex items-center gap-1 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#77CC00]" />
              </span>
              <span className="text-xs text-gray-500 ml-1">Live-Status aktiv</span>
            </div>
          )}
        </div>

        {/* Progress stepper */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-0">
              {STEPS.map((step, i) => {
                const done = currentStep >= i
                const isLast = i === STEPS.length - 1
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? 'bg-[#77CC00]' : 'bg-gray-200'}`}>
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-1 transition-colors ${currentStep > i ? 'bg-[#77CC00]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2">
              {STEPS.map((step) => (
                <p key={step} className="text-[9px] text-gray-400 text-center w-7">
                  {STATUS_CONFIG[step].label.split(' ')[0]}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-[#1A1A1A]">Bestelldetails</h2>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Bestellnummer</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Name</span>
            <span className="font-semibold text-[#1A1A1A]">{order.customer_name}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Art</span>
            <span className="font-semibold text-[#1A1A1A] capitalize">{order.order_type}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
            <span className="font-bold">Gesamt</span>
            <span className="font-extrabold text-[#77CC00]">{formatEur(order.total_amount)}</span>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <a
            href={`/${domain}`}
            className="text-sm text-[#4a8500] underline"
          >
            Neue Bestellung aufgeben
          </a>
        </div>
      </main>
    </div>
  )
}
