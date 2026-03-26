"use client"

import { useEffect, useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Clock, CheckCircle2, ChefHat, Bell, Loader2, Banknote, Hourglass } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import type { Database } from '@/types/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderStatus = OrderRow['status']

// ---------------------------------------------------------------------------
// Column definitions (3 active + 1 delivered/archive)
// ---------------------------------------------------------------------------

interface KdsColumn {
  status: OrderStatus
  label: string
  icon: React.ReactNode
  headerClass: string
  badgeClass: string
  nextStatus: OrderStatus | null
  nextLabel: string | null
}

const COLUMNS: KdsColumn[] = [
  {
    status: 'pending',
    label: 'Neu',
    icon: <Bell className="w-4 h-4" />,
    headerClass: 'text-amber-600',
    badgeClass: 'bg-amber-50 border-amber-200 text-amber-700',
    nextStatus: 'preparing',
    nextLabel: 'Zubereiten →',
  },
  {
    status: 'preparing',
    label: 'In Zubereitung',
    icon: <ChefHat className="w-4 h-4" />,
    headerClass: 'text-blue-600',
    badgeClass: 'bg-blue-50 border-blue-200 text-blue-700',
    nextStatus: 'ready',
    nextLabel: 'Fertig →',
  },
  {
    status: 'ready',
    label: 'Bereit',
    icon: <CheckCircle2 className="w-4 h-4" />,
    headerClass: 'text-[#77CC00]',
    badgeClass: 'bg-[#F0FBD8] border-[#77CC00]/30 text-[#4a8500]',
    nextStatus: 'delivered',
    nextLabel: 'Ausgeliefert ✓',
  },
  {
    status: 'delivered',
    label: 'Ausgeliefert',
    icon: <Banknote className="w-4 h-4" />,
    headerClass: 'text-gray-600',
    badgeClass: 'bg-gray-50 border-gray-200 text-gray-600',
    nextStatus: null,
    nextLabel: null,
  },
]

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready']

// ---------------------------------------------------------------------------
// Payout status badge
// ---------------------------------------------------------------------------

function PayoutBadge({ status }: { status: OrderRow['payout_status'] }) {
  if (status === 'paid') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-[#4a8500] bg-[#F0FBD8] border border-[#77CC00]/30 px-2 py-0.5 rounded-full">
        <Banknote className="w-2.5 h-2.5" />
        Ausgezahlt
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <Hourglass className="w-2.5 h-2.5" />
      Ausstehend
    </span>
  )
}

// ---------------------------------------------------------------------------
// Order card
// ---------------------------------------------------------------------------

interface OrderCardProps {
  order: OrderRow
  col: KdsColumn
  projectId: string
}

function OrderCard({ order, col, projectId }: OrderCardProps) {
  const [isPending, startTransition] = useTransition()
  const [localError, setLocalError] = useState<string | null>(null)

  const handleAdvance = () => {
    if (!col.nextStatus) return
    const next = col.nextStatus
    setLocalError(null)
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, projectId, next)
      if (result.error) setLocalError(result.error)
    })
  }

  const timeStr = new Date(order.created_at).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const formatEur = (cents: number) =>
    `€ ${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`

  return (
    <div className={`rounded-xl border p-4 bg-white shadow-sm space-y-3 ${col.badgeClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-900 text-base leading-tight">
            {order.customer_name || 'Gast'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeStr} · {order.order_type === 'delivery' ? '🛵 Lieferung' : order.order_type === 'takeaway' ? '🛍️ Abholung' : '📱 In-Store'}
            {order.table_number && (
              <span className="ml-1 font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                Tisch {order.table_number}
              </span>
            )}
          </p>
        </div>
        <span className="text-sm font-bold text-gray-800 tabular-nums whitespace-nowrap">
          {formatEur(order.total_amount)}
        </span>
      </div>

      {/* Payout badge — only on delivered orders */}
      {order.status === 'delivered' && (
        <div className="flex items-center">
          <PayoutBadge status={order.payout_status} />
        </div>
      )}

      {localError && (
        <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">{localError}</p>
      )}

      {col.nextStatus && (
        <button
          onClick={handleAdvance}
          disabled={isPending}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            col.nextStatus === 'preparing'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : col.nextStatus === 'ready'
              ? 'bg-[#77CC00] hover:bg-[#66b300] text-white'
              : 'bg-gray-800 hover:bg-gray-900 text-white'
          } disabled:opacity-50`}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {col.nextLabel}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface KitchenDisplayProps {
  projectId: string
}

// Start of today in UTC (resets the delivered archive each day)
function startOfTodayISO() {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function KitchenDisplay({ projectId }: KitchenDisplayProps) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchOrders = async () => {
      // Load active orders + today's delivered orders (for payout transparency)
      const [activeRes, deliveredRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('project_id', projectId)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: true }),
        supabase
          .from('orders')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'delivered')
          .gte('created_at', startOfTodayISO())
          .order('created_at', { ascending: true }),
      ])

      setOrders([...(activeRes.data ?? []), ...(deliveredRes.data ?? [])])
      setIsLoading(false)
    }

    void fetchOrders()

    const channel = supabase
      .channel(`kds-${projectId}`)
      .on<OrderRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setOrders((prev) => {
            if (payload.eventType === 'INSERT') {
              const newOrder = payload.new
              // Show if active or delivered today
              const isActive = ACTIVE_STATUSES.includes(newOrder.status)
              const isDeliveredToday =
                newOrder.status === 'delivered' &&
                newOrder.created_at >= startOfTodayISO()
              if (!isActive && !isDeliveredToday) return prev
              return [...prev, newOrder].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            }
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new
              const isActive = ACTIVE_STATUSES.includes(updated.status)
              const isDeliveredToday =
                updated.status === 'delivered' &&
                updated.created_at >= startOfTodayISO()

              if (!isActive && !isDeliveredToday) {
                // e.g. cancelled — remove from board
                return prev.filter((o) => o.id !== updated.id)
              }
              // Update in place (covers payout_status changes too)
              const exists = prev.find((o) => o.id === updated.id)
              if (exists) return prev.map((o) => (o.id === updated.id ? updated : o))
              // Newly delivered — add to board
              return [...prev, updated].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            }
            // DELETE
            return prev.filter((o) => o.id !== (payload.old as Partial<OrderRow>).id)
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [projectId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Laden…</span>
      </div>
    )
  }

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length
  const deliveredPaid = orders.filter((o) => o.status === 'delivered' && o.payout_status === 'paid').length
  const deliveredPending = orders.filter((o) => o.status === 'delivered' && o.payout_status === 'pending').length

  return (
    <div className="space-y-5">
      {/* Live bar */}
      <div className="flex items-center gap-3 bg-[#F0FBD8] border border-[#77CC00]/30 rounded-xl px-4 py-3 flex-wrap">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#77CC00]" />
        </span>
        <span className="text-sm font-semibold text-[#4a8500]">
          {activeCount === 0 ? 'Keine aktiven Bestellungen' : `${activeCount} aktive Bestellung${activeCount !== 1 ? 'en' : ''}`}
        </span>
        <span className="text-xs text-[#4a8500]/70 ml-auto">Echtzeit aktiv</span>
        {/* Payout summary */}
        {(deliveredPaid > 0 || deliveredPending > 0) && (
          <div className="flex items-center gap-2 ml-0 text-xs text-gray-500 border-l border-[#77CC00]/20 pl-3 flex-wrap">
            {deliveredPaid > 0 && (
              <span className="flex items-center gap-1 text-[#4a8500] font-semibold">
                <Banknote className="w-3 h-3" /> {deliveredPaid} ausgezahlt
              </span>
            )}
            {deliveredPending > 0 && (
              <span className="flex items-center gap-1 text-amber-700 font-semibold">
                <Hourglass className="w-3 h-3" /> {deliveredPending} ausstehend
              </span>
            )}
          </div>
        )}
      </div>

      {/* Kanban columns — 4 columns on xl, 2 on md */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status)
          return (
            <div key={col.status} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
              <div className={`flex items-center justify-between mb-4 ${col.headerClass}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {col.icon}
                  {col.label}
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${col.badgeClass}`}>
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[100px]">
                {colOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                    {col.status === 'delivered' ? 'Heute noch keine Lieferungen' : 'Keine Bestellungen'}
                  </p>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard key={order.id} order={order} col={col} projectId={projectId} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
