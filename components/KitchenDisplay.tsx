"use client"

import { useEffect, useState, useTransition, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Clock, CheckCircle2, ChefHat, Bell, Loader2, Banknote, Hourglass, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import { markNoShow } from '@/app/[domain]/actions'
import type { Database } from '@/types/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderStatus = OrderRow['status']
type ConnectionStatus = 'CONNECTING' | 'ONLINE' | 'OFFLINE'

// Order mit eingebetteten Items + Artikel-Namen
interface OrderItemOption {
  id: string
  option_name: string
  option_group_name: string
  price_cents: number
}

interface OrderItem {
  id: string
  quantity: number
  price_at_time: number
  item_name: string | null
  customer_note: string | null
  order_item_options?: OrderItemOption[]
}

interface OrderWithItems extends OrderRow {
  order_items: OrderItem[]
}

interface KdsColumn {
  status: OrderStatus
  label: string
  icon: React.ReactNode
  headerClass: string
}

// ── COLUMNS config ──────────────────────────────────────────────────
const COLUMNS: KdsColumn[] = [
  { status: 'pending',   label: 'Neu',            icon: <Bell className="w-5 h-5" />,         headerClass: 'text-amber-400'  },
  { status: 'preparing', label: 'In Zubereitung', icon: <ChefHat className="w-5 h-5" />,      headerClass: 'text-blue-400'   },
  { status: 'ready',     label: 'Bereit',         icon: <CheckCircle2 className="w-5 h-5" />, headerClass: 'text-[#C7A17A]'  },
  { status: 'delivered', label: 'Ausgeliefert',   icon: <Banknote className="w-5 h-5" />,     headerClass: 'text-white/40'   },
]

function PayoutBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#3D2E1E] border border-[#C7A17A]/30 text-[#C7A17A]">
        Bezahlt
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-950/60 border border-amber-500/20 text-amber-400">
      Ausstehend
    </span>
  )
}

function OrderCard({ order, projectId, onUpdate, onNoShow }: { order: OrderWithItems; projectId: string; onUpdate: (id: string, status: OrderStatus) => void; onNoShow: (id: string) => void }) {
  const [isPending, startTransition] = useTransition()
  const [noShowPending, setNoShowPending] = useState(false)
  const [noShowDone, setNoShowDone] = useState(!!((order as OrderWithItems & { no_show?: boolean }).no_show))

  const handleNextStatus = () => {
    const currentIndex = COLUMNS.findIndex(c => c.status === order.status)
    if (currentIndex < COLUMNS.length - 1) {
      const nextStatus = COLUMNS[currentIndex + 1].status
      startTransition(() => {
        onUpdate(order.id, nextStatus)
      })
    }
  }

  const items = order.order_items ?? []
  const isReadyStatus = order.status === 'ready'
  const isCashOrder = !(order as OrderWithItems & { payment_status?: string | null }).payment_status ||
    (order as OrderWithItems & { payment_status?: string | null }).payment_status === 'pending'
  const showNoShowButton = isReadyStatus && isCashOrder && !noShowDone

  const handleNoShow = async () => {
    if (noShowPending || noShowDone) return
    if (!confirm('Bestellung als No-Show melden? Der Kunde wird für Barzahlung gesperrt.')) return
    setNoShowPending(true)
    const result = await markNoShow(order.id, projectId)
    setNoShowPending(false)
    if (!result.error) {
      setNoShowDone(true)
      onNoShow(order.id)
    } else {
      alert(`Fehler: ${result.error}`)
    }
  }

  return (
    <div className="glass-card bg-[#242424] border border-white/5 shadow-xl rounded-xl p-4 flex flex-col gap-3 fade-in-up hover:border-white/10 smooth-transition relative overflow-hidden group">

      {/* Header: Bestellnr + Uhrzeit + Betrag */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-bold text-lg">#{order.id.slice(0, 5).toUpperCase()}</h3>
          <p className="text-white/50 text-sm flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-semibold">{((order.total_amount ?? 0) / 100).toFixed(2)} €</p>
          <div className="mt-1.5">
            <PayoutBadge status={order.payout_status ?? 'pending'} />
          </div>
        </div>
      </div>

      {/* Kundenname + Art */}
      <div className="flex items-center justify-between text-sm border-t border-white/5 pt-2">
        <span className="text-white/70 font-medium">{order.customer_name ?? 'Gast'}</span>
        {order.order_type && (
          <span className={`text-xs uppercase tracking-wide font-bold ${
            order.order_type === 'delivery' ? 'text-[#C7A17A]' : 'text-white/40'
          }`}>{order.order_type}</span>
        )}
      </div>
      {/* M19: Lieferadresse */}
      {order.order_type === 'delivery' && (order as OrderWithItems & { delivery_address?: string | null }).delivery_address && (
        <div className="text-xs text-white/50 bg-white/5 rounded-lg px-3 py-1.5 flex items-start gap-1.5 -mt-1">
          <span className="shrink-0">📍</span>
          <span className="break-words">{(order as OrderWithItems & { delivery_address?: string | null }).delivery_address}</span>
        </div>
      )}

      {/* Bestellpositionen */}
      {items.length > 0 && (
        <div className="bg-black/30 rounded-lg border border-white/5 divide-y divide-white/5">
          {items.map((item) => {
            const opts = Array.isArray(item.order_item_options) ? item.order_item_options : []
            return (
              <div key={item.id} className="border-b border-white/5 last:border-none px-3 py-2 text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#C7A17A] font-bold text-base leading-none">{item.quantity}×</span>
                    <span className="text-white/85">{item.item_name ?? '—'}</span>
                  </div>
                  <span className="text-white/40 text-xs shrink-0 ml-2">
                    {((item.price_at_time ?? 0) / 100).toFixed(2)} €
                  </span>
                </div>
                {/* Gewählte Extras */}
                {opts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-6">
                    {opts.map(o => (
                      <span key={o.id} className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(199,161,122,0.12)', color: '#C7A17A', border: '1px solid rgba(199,161,122,0.25)' }}>
                        {o.option_name}{o.price_cents > 0 ? ` +${(o.price_cents / 100).toFixed(2)}€` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {/* Kundennotiz */}
                {item.customer_note && (
                  <p className="mt-1 ml-6 text-amber-300/80 text-xs italic">💬 {item.customer_note}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Nächster Schritt Button */}
      {order.status !== 'delivered' && (
        <button
          onClick={handleNextStatus}
          disabled={isPending}
          className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium smooth-transition flex items-center justify-center gap-2 border border-white/5 hover:border-white/20 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Nächster Schritt →'}
        </button>
      )}

      {/* M26: No-Show melden (nur bei Abholung/Lieferung bereit, Barzahlung) */}
      {noShowDone && (
        <div className="flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          No-Show gemeldet
        </div>
      )}
      {showNoShowButton && (
        <button
          id={`btn-no-show-${order.id.slice(0,8)}`}
          onClick={handleNoShow}
          disabled={noShowPending}
          className="w-full py-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 text-xs font-semibold smooth-transition flex items-center justify-center gap-2 border border-red-500/20 hover:border-red-500/40 disabled:opacity-50"
        >
          {noShowPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><AlertTriangle className="w-3.5 h-3.5" /> No-Show melden</>}
        </button>
      )}
    </div>
  )
}

export default function KitchenDisplay({ projectId }: { projectId: string }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING')

  const handleNoShowLocal = (orderId: string) => {
    setOrders(cur => cur.map(o => o.id === orderId ? { ...o, no_show: true } as OrderWithItems & { no_show: boolean } : o))
  }

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchOrders = useCallback(async () => {
    // Nur Bestellungen von heute (ab Mitternacht)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, price_at_time, item_name, customer_note, order_item_options(id, option_name, option_group_name, price_cents))')
      .eq('project_id', projectId)
      .gte('created_at', todayStart.toISOString())
      // null/unpaid = Barzahlung, paid = Karte; 'pending' = Karte noch offen → blockieren
      .or('payment_status.is.null,payment_status.eq.paid,payment_status.eq.unpaid')
      .order('created_at', { ascending: true })

    if (data) setOrders(data as OrderWithItems[])
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
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
    <div className="bg-transparent flex flex-col w-full">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 p-6 items-start">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter(o => o.status === col.status)
          return (
            <div key={col.status} className="flex flex-col bg-white/[0.02] rounded-2xl border border-white/5 p-4 relative">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className={`flex items-center gap-2 font-bold uppercase tracking-wider text-sm ${col.headerClass}`}>
                  {col.icon}
                  {col.label}
                </div>
                <div className="bg-white/5 text-white/50 border border-white/10 rounded-full px-3 py-0.5 text-xs font-bold">
                  {colOrders.length}
                </div>
              </div>

              <div className="space-y-4">
                {colOrders.length === 0 ? (
                  <div className="border border-dashed border-white/10 text-white/30 rounded-xl p-8 flex flex-col items-center justify-center text-center h-40">
                    <Hourglass className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Keine Aufträge</p>
                  </div>
                ) : (
                  colOrders.map(order => (
                    <OrderCard key={order.id} order={order} projectId={projectId} onUpdate={handleUpdateStatus} onNoShow={handleNoShowLocal} />
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
