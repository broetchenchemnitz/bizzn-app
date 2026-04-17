import Link from 'next/link'
import { ArrowLeft, Search, ListOrdered } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { notFound, redirect } from 'next/navigation'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type OrderRow   = Database['public']['Tables']['orders']['Row']
interface OrderItem { id: string; quantity: number; price_at_time: number; item_name: string | null }
interface OrderWithItems extends OrderRow { order_items: OrderItem[] }

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Bestellarchiv | Bizzn Gastro-OS',
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Neu',            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  preparing: { label: 'In Zubereitung', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  ready:     { label: 'Bereit',         color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  delivered: { label: 'Ausgeliefert',   color: '#9ca3af', bg: 'rgba(156,163,175,0.08)'},
  cancelled: { label: 'Storniert',      color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
}

const TYPE_LABELS: Record<string, string> = {
  takeaway: 'Abholung',
  delivery: 'Lieferung',
  'in-store': 'Vor Ort',
}

export default async function OrdersArchivePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { status?: string; q?: string; date?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) notFound()

  // ── Bestellungen laden ────────────────────────────────────────────────
  const admin = createAdminClient()
  let query = admin
    .from('orders')
    .select('*, order_items(id, quantity, price_at_time, item_name)')
    .eq('project_id', params.id)
    // null/unpaid = Barzahlung sichtbar; nur 'pending' (Karte noch offen) blockieren
    .or('payment_status.is.null,payment_status.eq.paid,payment_status.eq.unpaid')
    .order('created_at', { ascending: false })

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  if (searchParams.date) {
    const day = new Date(searchParams.date)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)
    query = query.gte('created_at', day.toISOString()).lt('created_at', nextDay.toISOString())
  }

  const { data: orders } = await query.returns<OrderWithItems[]>()
  const allOrders = orders ?? []

  // Suche clientseitig auf geladenen Daten (Name / Bestellnr)
  const q = searchParams.q?.toLowerCase() ?? ''
  const filtered = q
    ? allOrders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.customer_name ?? '').toLowerCase().includes(q) ||
        o.order_items.some(i => (i.item_name ?? '').toLowerCase().includes(q))
      )
    : allOrders

  // Statistiken
  const totalRevenue = filtered.reduce((s, o) => s + (o.total_amount ?? 0), 0)

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Back */}
        <div className="flex items-center">
          <Link
            href={`/dashboard/project/${params.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Zurück zum Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
            <ListOrdered className="w-8 h-8 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Bestellarchiv</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{project.name} · Alle Bestellungen</p>
          </div>
          <div className="ml-auto flex gap-6 text-right">
            <div>
              <p className="text-2xl font-bold text-white">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Bestellungen</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gold">
                {(totalRevenue / 100).toFixed(2).replace('.', ',')} €
              </p>
              <p className="text-xs text-muted-foreground">Umsatz</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <form method="GET" className="glass-card rounded-2xl p-4 flex flex-wrap gap-3 items-center">
          {/* Suche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="Name, Bestellnr. oder Artikel..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50"
            />
          </div>

          {/* Status */}
          <select
            name="status"
            defaultValue={searchParams.status ?? 'all'}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-gold/50"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Neu</option>
            <option value="preparing">In Zubereitung</option>
            <option value="ready">Bereit</option>
            <option value="delivered">Ausgeliefert</option>
            <option value="cancelled">Storniert</option>
          </select>

          {/* Datum */}
          <input
            type="date"
            name="date"
            defaultValue={searchParams.date ?? ''}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-gold/50 [color-scheme:dark]"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-sm font-semibold transition-all"
          >
            Filtern
          </button>

          {(searchParams.status || searchParams.q || searchParams.date) && (
            <Link
              href={`/dashboard/project/${params.id}/orders`}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/50 text-sm transition-all"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Bestelltabelle */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-white/30">
              <ListOrdered className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Keine Bestellungen gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-semibold">Nr.</th>
                    <th className="text-left px-5 py-3 font-semibold">Datum & Zeit</th>
                    <th className="text-left px-5 py-3 font-semibold">Kunde</th>
                    <th className="text-left px-5 py-3 font-semibold">Artikel</th>
                    <th className="text-left px-5 py-3 font-semibold">Art</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-right px-5 py-3 font-semibold">Betrag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((order) => {
                    const st = STATUS_LABELS[order.status ?? ''] ?? { label: order.status, color: '#9ca3af', bg: 'transparent' }
                    const isDriveIn = !!(order as OrderWithItems & { drive_in_arrived_at?: string | null }).drive_in_arrived_at
                    return (
                      <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-white/70 text-xs">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-white/50 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                          <span className="mx-1.5 text-white/20">·</span>
                          {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-white font-medium">{order.customer_name ?? '—'}</span>
                          {isDriveIn && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                              🚗 Drive-In
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-white/60 max-w-[280px]">
                          <span className="truncate block">
                            {order.order_items.map(i => `${i.quantity}× ${i.item_name ?? '?'}`).join(', ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-white/50 whitespace-nowrap">
                          {TYPE_LABELS[order.order_type ?? ''] ?? order.order_type ?? '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                            style={{ color: st.color, background: st.bg }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-white whitespace-nowrap">
                          {((order.total_amount ?? 0) / 100).toFixed(2).replace('.', ',')} €
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
