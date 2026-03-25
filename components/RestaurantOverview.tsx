"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { ShoppingBag, TrendingUp, UtensilsCrossed, ArrowUpRight, Clock, AlertTriangle } from 'lucide-react'
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
      className={`rounded-2xl p-6 flex flex-col gap-4 border transition-shadow hover:shadow-md ${
        accent
          ? 'bg-[#77CC00] border-[#66b300] text-white'
          : 'bg-white border-gray-100 text-gray-900'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            accent ? 'bg-white/20' : 'bg-[#F0FBD8]'
          }`}
        >
          <span className={accent ? 'text-white' : 'text-[#77CC00]'}>{icon}</span>
        </div>
        <ArrowUpRight className={`w-4 h-4 ${accent ? 'text-white/70' : 'text-gray-300'}`} />
      </div>
      <div>
        <p className={`text-sm font-medium ${accent ? 'text-white/80' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`text-3xl font-bold tracking-tight mt-0.5 ${accent ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
        <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
      </div>
    </div>
  )
}

interface StatusBadgeProps {
  label: string
  active: boolean
}

function StatusBadge({ label, active }: StatusBadgeProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-[#77CC00]/40 transition-colors cursor-pointer">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-[#77CC00]' : 'bg-gray-300'}`} />
        <span className={`text-xs font-medium ${active ? 'text-[#77CC00]' : 'text-gray-400'}`}>
          {active ? 'Aktiv' : 'Inaktiv'}
        </span>
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
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Auszahlungen noch nicht aktiviert</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Verbinde dein Stripe-Konto, um Auszahlungen zu empfangen.
            </p>
          </div>
          <Link
            href={`/api/stripe/connect?projectId=${projectId}`}
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Jetzt aktivieren →
          </Link>
        </div>
      )}
      {/* Live Status Bar */}
      <div className="flex items-center gap-2 bg-[#F0FBD8] border border-[#77CC00]/30 rounded-xl px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#77CC00]" />
        </span>
        <span className="text-sm font-semibold text-[#4a8500]">Restaurant live</span>
        <span className="text-xs text-[#4a8500]/70 ml-auto flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Echtzeit-Daten aktiv
        </span>
      </div>

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

      {/* Channel Status */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
          Bestellkanäle
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatusBadge label="🛵  Lieferung" active={true} />
          <StatusBadge label="🛍️  Abholung (Takeaway)" active={true} />
          <StatusBadge label="📱  In-Store / QR-Code" active={false} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link
          href={`/dashboard/project/${projectId}/orders`}
          className="flex items-center justify-center gap-2 bg-[#77CC00] hover:bg-[#66b300] text-white font-semibold px-5 py-3.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <ShoppingBag className="w-4 h-4" />
          Bestellungen verwalten
        </Link>
        <Link
          href={`/dashboard/project/${projectId}/menu`}
          className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-3.5 rounded-xl text-sm border border-gray-200 transition-colors shadow-sm"
        >
          <UtensilsCrossed className="w-4 h-4" />
          Speisekarte bearbeiten
        </Link>
      </div>
    </div>
  )
}
