"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { ShoppingBag, TrendingUp, UtensilsCrossed, ArrowUpRight, AlertTriangle } from 'lucide-react'
import type { Database } from '@/types/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent?: boolean
}

function KpiCard({ icon, label, value, sub, accent = false }: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl border transition-all relative ${
        accent
          ? 'bg-[#C7A17A] border-[#9A7450] shadow-[0_0_20px_rgba(199,161,122,0.35)] text-black'
          : 'bg-[#242424] border-[#C7A17A]/30 shadow-[0_0_20px_rgba(199,161,122,0.15)] text-white hover:border-[#C7A17A]/50'
      }`}
    >
      <div className="p-5 flex flex-col gap-3 relative overflow-hidden rounded-2xl">
        <div className="flex items-start justify-between">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              accent ? 'bg-black/15' : 'bg-[#1A1A1A]'
            }`}
          >
            <span className={`${accent ? 'text-black' : 'text-[#C7A17A]'} [&>svg]:w-5 [&>svg]:h-5`}>{icon}</span>
          </div>
          <ArrowUpRight className={`w-3.5 h-3.5 ${accent ? 'text-black/40' : 'text-[#C7A17A]/40'}`} />
        </div>
        <div>
          <p className={`text-xs font-medium tracking-wide uppercase ${
            accent ? 'text-black/70' : 'text-gray-400'
          }`}>
            {label}
          </p>
          <p className={`text-4xl font-extrabold tracking-tight mt-1 leading-none ${
            accent ? 'text-black' : 'text-[#C7A17A] drop-shadow-[0_0_8px_rgba(199,161,122,0.5)]'
          }`}>
            {value}
          </p>
          <p className={`text-xs mt-1.5 font-medium ${accent ? 'text-black/60' : 'text-gray-500'}`}>{sub}</p>
        </div>
      </div>
    </div>
  )
}



// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Metrics {
  liveOrdersCount: number
  inPrepCount: number
  inDeliveryCount: number
  todayRevenueCents: number
}

function computeMetrics(orders: OrderRow[]): Metrics {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayOrders = orders.filter(
    (o) => new Date(o.created_at) >= todayStart
  )

  const active = todayOrders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
  )
  const inPrepCount = todayOrders.filter((o) => o.status === 'preparing').length
  const inDeliveryCount = todayOrders.filter((o) => o.status === 'ready').length

  const todayRevenueCents = todayOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0)

  return {
    liveOrdersCount: active.length,
    inPrepCount,
    inDeliveryCount,
    todayRevenueCents,
  }
}

function formatEur(cents: number): string {
  return `€ ${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RestaurantOverviewProps {
  projectId: string
}

export default function RestaurantOverview({ projectId }: RestaurantOverviewProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    liveOrdersCount: 0,
    inPrepCount: 0,
    inDeliveryCount: 0,
    todayRevenueCents: 0,
  })
  const [allOrders, setAllOrders] = useState<OrderRow[]>([])
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch Stripe payout status
    const fetchStripeStatus = async () => {
      const { data: proj } = await supabase
        .from('projects')
        .select('stripe_payouts_enabled')
        .eq('id', projectId)
        .single<Pick<ProjectRow, 'stripe_payouts_enabled'>>()
      setStripePayoutsEnabled(proj?.stripe_payouts_enabled ?? false)
    }

    // Initial fetch — today's orders
    const fetchInitial = async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      const rows: OrderRow[] = data ?? []
      setAllOrders(rows)
      setMetrics(computeMetrics(rows))
    }

    void fetchStripeStatus()
    void fetchInitial()

    // Realtime subscription
    const channel = supabase
      .channel(`orders-${projectId}`)
      .on<OrderRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setAllOrders((prev) => {
            let updated: OrderRow[]

            if (payload.eventType === 'INSERT') {
              updated = [payload.new, ...prev]
            } else if (payload.eventType === 'UPDATE') {
              updated = prev.map((o) => (o.id === payload.new.id ? payload.new : o))
            } else {
              // DELETE
              updated = prev.filter((o) => o.id !== payload.old.id)
            }

            setMetrics(computeMetrics(updated))
            return updated
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [projectId])

  // Suppress unused variable lint — allOrders drives metrics via setAllOrders callback
  void allOrders

  return (
    <div className="space-y-6">
      {/* Stripe Payout Warning Banner */}
      {stripePayoutsEnabled === false && (
        <div className="flex items-start gap-3 bg-[#2a1f00] border border-amber-800 rounded-xl px-4 py-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Auszahlungen noch nicht aktiviert</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Verbinde dein Stripe-Konto, um Auszahlungen zu empfangen.
            </p>
          </div>
          <Link
            href={`/api/stripe/connect?projectId=${projectId}`}
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Jetzt aktivieren →
          </Link>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Live Bestellungen"
          value={String(metrics.liveOrdersCount)}
          sub={`${metrics.inPrepCount} in Zubereitung · ${metrics.inDeliveryCount} bereit`}
          accent
        />
        <KpiCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Tagesumsatz"
          value={formatEur(metrics.todayRevenueCents)}
          sub="Ausgelieferte Bestellungen heute"
        />
        <KpiCard
          icon={<UtensilsCrossed className="w-6 h-6" />}
          label="Aktive Speisen"
          value="—"
          sub="Speisekarte öffnen um zu verwalten"
        />
      </div>


      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link
          href={`/dashboard/project/${projectId}/orders`}
          className="btn-glow-primary flex items-center justify-center gap-2 bg-[#C7A17A] text-[#1A1A1A] font-extrabold rounded-full px-5 sm:px-8 py-3.5 sm:py-4 text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 z-0"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Bestellungen</span>
          <span className="sm:hidden">KDS</span>
        </Link>
        <Link
          href={`/dashboard/project/${projectId}/menu`}
          className="btn-glow-secondary flex items-center justify-center gap-2 bg-[#242424] hover:bg-[#2d2d2d] text-gray-200 hover:text-white font-semibold rounded-full px-5 sm:px-8 py-3.5 sm:py-4 text-sm border border-white/5 transition-all duration-300 hover:border-white/10 z-0"
        >
          <UtensilsCrossed className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Speisekarte</span>
          <span className="sm:hidden">Menü</span>
        </Link>
      </div>
    </div>
  )
}
