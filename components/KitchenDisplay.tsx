"use client"

import { useEffect, useState, useTransition, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Clock, CheckCircle2, ChefHat, Bell, Loader2, Banknote, Hourglass, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import type { Database } from '@/types/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderStatus = OrderRow['status']
type ConnectionStatus = 'CONNECTING' | 'ONLINE' | 'OFFLINE'

interface KdsColumn {
  status: OrderStatus
  label: string
  icon: React.ReactNode
  headerClass: string
  badgeClass: string
}

// ── COLUMNS config ──────────────────────────────────────────────────
const COLUMNS: KdsColumn[] = [
  { status: 'pending',   label: 'Neu',            icon: <Bell className="w-5 h-5" />,         headerClass: 'text-amber-400',  badgeClass: 'bg-amber-950/60 border-amber-500/20 text-amber-400' },
  { status: 'preparing', label: 'In Zubereitung', icon: <ChefHat className="w-5 h-5" />,      headerClass: 'text-blue-400',   badgeClass: 'bg-blue-950/60 border-blue-500/20 text-blue-400' },
  { status: 'ready',     label: 'Bereit',         icon: <CheckCircle2 className="w-5 h-5" />, headerClass: 'text-[#C7A17A]',  badgeClass: 'bg-[#3D2E1E] border-[#C7A17A]/30 text-[#C7A17A]' },
  { status: 'delivered', label: 'Ausgeliefert',   icon: <Banknote className="w-5 h-5" />,     headerClass: 'text-white/40',   badgeClass: 'bg-white/5 border-white/10 text-white/50' },
]

function PayoutBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#3D2E1E] border border-[#C7A17A]/30 text-[#C7A17A]">
        Bezahlt
      </span>
    )
  }
  return (
    <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-950/60 border border-amber-500/20 text-amber-400">
      Ausstehend
    </span>
  )
}

function OrderCard({ order, onUpdate }: { order: OrderRow; onUpdate: (id: string, status: OrderStatus) => void }) {
  const [isPending, startTransition] = useTransition()

  const handleNextStatus = () => {
    const currentIndex = COLUMNS.findIndex(c => c.status === order.status)
    if (currentIndex < COLUMNS.length - 1) {
      const nextStatus = COLUMNS[currentIndex + 1].status
      startTransition(() => {
        onUpdate(order.id, nextStatus)
      })
    }
  }

  return (
    <div className="glass-card bg-[#242424] border border-white/5 shadow-xl rounded-xl p-4 flex flex-col gap-3 fade-in-up hover:border-white/10 smooth-transition relative overflow-hidden group">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-bold text-lg">#{order.id.slice(0, 5).toUpperCase()}</h3>
          <p className="text-white/50 text-sm flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-semibold">{order.total_amount?.toFixed(2)} €</p>
          <div className="mt-2">
            <PayoutBadge status={order.payout_status ?? 'pending'} />
          </div>
        </div>
      </div>

      <div className="py-2 border-y border-white/5">
        <p className="text-white/70 text-sm">
          {order.customer_name ?? 'Gast'}
        </p>
      </div>

      {order.status !== 'delivered' && (
        <button
          onClick={handleNextStatus}
          disabled={isPending}
          className="mt-2 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium smooth-transition flex items-center justify-center gap-2 border border-white/5 hover:border-white/20 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Nächster Schritt →'}
        </button>
      )}
    </div>
  )
}

export default function KitchenDisplay({ projectId }: { projectId: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING')

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (data) setOrders(data)
  }, [projectId, supabase])

  useEffect(() => {
    void fetchOrders()

    const channel = supabase
      .channel(`kds-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `project_id=eq.${projectId}` },
        () => { void fetchOrders() }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('ONLINE')
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') setConnectionStatus('OFFLINE')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [projectId, supabase, fetchOrders])

  const handleUpdateStatus = async (id: string, newStatus: OrderStatus) => {
    // Optimistic update
    setOrders(current => current.map(o => o.id === id ? { ...o, status: newStatus } : o))
    await updateOrderStatus(id, projectId, newStatus)
  }

  return (
    <div className="bg-transparent flex flex-col h-full w-full">
      {/* Header Bar */}
      <div className="bg-[#1e1e1e]/80 backdrop-blur-md border-b border-white/5 p-4 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-black/40 p-2 rounded-lg border border-white/5">
            <ChefHat className="text-[#C7A17A] w-6 h-6" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">Küchen-Monitor</h2>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mt-0.5">Live Kitchen Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium shadow-inner ${
            connectionStatus === 'ONLINE'
              ? 'bg-emerald-950/60 border-emerald-500/20 text-emerald-400'
              : connectionStatus === 'CONNECTING'
              ? 'bg-amber-950/60 border-amber-500/20 text-amber-400'
              : 'bg-red-950/60 border-red-500/20 text-red-400'
          }`}>
            {connectionStatus === 'ONLINE'      && <Wifi className="w-4 h-4" />}
            {connectionStatus === 'CONNECTING'  && <RefreshCw className="w-4 h-4 animate-spin" />}
            {connectionStatus === 'OFFLINE'     && <WifiOff className="w-4 h-4" />}
            <span>
              {connectionStatus === 'ONLINE' ? 'Verbunden' : connectionStatus === 'CONNECTING' ? 'Verbindet...' : 'Getrennt'}
            </span>
          </div>
          <div className="text-white font-medium bg-white/5 px-4 py-1.5 rounded-full border border-white/5 text-sm">
            <span className="text-white/50 mr-2">Aktive Bons:</span>
            {orders.filter(o => o.status !== 'delivered').length}
          </div>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 p-6 overflow-x-auto overflow-y-hidden">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter(o => o.status === col.status)
          return (
            <div key={col.status} className="flex flex-col h-full bg-white/[0.02] rounded-2xl border border-white/5 p-4 relative">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className={`flex items-center gap-2 font-bold uppercase tracking-wider text-sm ${col.headerClass}`}>
                  {col.icon}
                  {col.label}
                </div>
                <div className="bg-white/5 text-white/50 border border-white/10 rounded-full px-3 py-0.5 text-xs font-bold">
                  {colOrders.length}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                {colOrders.length === 0 ? (
                  <div className="border border-dashed border-white/10 text-white/30 rounded-xl p-8 flex flex-col items-center justify-center text-center h-40">
                    <Hourglass className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Keine Aufträge</p>
                  </div>
                ) : (
                  colOrders.map(order => (
                    <OrderCard key={order.id} order={order} onUpdate={handleUpdateStatus} />
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
