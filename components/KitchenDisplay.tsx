"use client"

import { useEffect, useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Clock, CheckCircle2, ChefHat, Bell, Loader2 } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import type { Database } from '@/types/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderStatus = OrderRow['status']

// ---------------------------------------------------------------------------
// Column definitions
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
]

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready']

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
          </p>
        </div>
        <span className="text-sm font-bold text-gray-800 tabular-nums whitespace-nowrap">
          {formatEur(order.total_amount)}
        </span>
      </div>

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

export default function KitchenDisplay({ projectId }: KitchenDisplayProps) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchActive = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: true })

      setOrders(data ?? [])
      setIsLoading(false)
    }

    void fetchActive()

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
              if (!ACTIVE_STATUSES.includes(newOrder.status)) return prev
              return [...prev, newOrder].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            }
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new
              // If status no longer active, remove from board
              if (!ACTIVE_STATUSES.includes(updated.status)) {
                return prev.filter((o) => o.id !== updated.id)
              }
              return prev.map((o) => (o.id === updated.id ? updated : o))
            }
            // DELETE
            return prev.filter((o) => o.id !== payload.old.id)
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

  const totalActive = orders.length

  return (
    <div className="space-y-5">
      {/* Live bar */}
      <div className="flex items-center gap-2 bg-[#F0FBD8] border border-[#77CC00]/30 rounded-xl px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#77CC00]" />
        </span>
        <span className="text-sm font-semibold text-[#4a8500]">
          {totalActive === 0 ? 'Keine aktiven Bestellungen' : `${totalActive} aktive Bestellung${totalActive !== 1 ? 'en' : ''}`}
        </span>
        <span className="text-xs text-[#4a8500]/70 ml-auto">Echtzeit aktiv</span>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Keine Bestellungen
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
