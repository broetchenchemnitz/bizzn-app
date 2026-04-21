"use client"

import { useEffect, useState, useTransition, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Bell, ChefHat, Wifi, WifiOff, RefreshCw, Maximize2, Minimize2, LayoutDashboard, RotateCcw } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import { reportNoShow } from '@/app/actions/no-show'
import type { Database } from '@/types/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderStatus = OrderRow['status']
type ConnectionStatus = 'CONNECTING' | 'ONLINE' | 'OFFLINE'

interface OrderItemOption { id: string; option_name: string; option_group_name: string; price_cents: number }
interface OrderItem { id: string; quantity: number; price_at_time: number; item_name: string | null; customer_note?: string | null; order_item_options?: OrderItemOption[] }
interface OrderWithItems extends OrderRow {
  order_items: OrderItem[]
  drive_in_arrived_at?: string | null
  drive_in_license_plate?: string | null
  drive_in_location_hint?: string | null
}

interface ColumnDef {
  status: OrderStatus
  label: string
  emoji: string
  accent: string
  next: string
  nextAccent: string
  nextTextColor: string
  isTable?: boolean
  filterFn?: (o: OrderWithItems) => boolean
}

const getStandardColumns = (): ColumnDef[] => [
  { status: 'pending',   label: 'NEU',                emoji: '🔔', accent: '#f59e0b', next: 'Annehmen',  nextAccent: '#f59e0b', nextTextColor: '#000' },
  { status: 'preparing', label: 'IN ZUBEREITUNG',     emoji: '👨‍🍳', accent: '#60a5fa', next: 'Fertig',   nextAccent: '#3b82f6', nextTextColor: '#fff' },
  { status: 'ready',     label: 'BEREIT ZUR ABHOLUNG',emoji: '✅', accent: '#34d399', next: 'Abgeholt', nextAccent: '#059669', nextTextColor: '#fff' }
]

const getOnlineColumns = (): ColumnDef[] => [
  { status: 'pending',   label: 'NEU',            emoji: '🔔', accent: '#f59e0b', next: 'Annehmen',  nextAccent: '#f59e0b', nextTextColor: '#000', filterFn: o => o.order_type !== 'in-store' },
  { status: 'preparing', label: 'IN ZUBEREITUNG', emoji: '👨‍🍳', accent: '#60a5fa', next: 'Fertig',   nextAccent: '#3b82f6', nextTextColor: '#fff', filterFn: o => o.order_type !== 'in-store' },
  { status: 'ready',     label: 'ZUR ABHOLUNG',   emoji: '🛍️', accent: '#34d399', next: 'Abgeholt', nextAccent: '#059669', nextTextColor: '#fff', filterFn: o => o.order_type !== 'in-store' }
]

const getTableColumns = (): ColumnDef[] => [
  { status: 'pending',   label: 'NEU',            emoji: '🔔', accent: '#C7A17A', next: 'Annehmen',  nextAccent: '#C7A17A', nextTextColor: '#000', isTable: true, filterFn: o => o.order_type === 'in-store' },
  { status: 'preparing', label: 'IN ZUBEREITUNG', emoji: '👨‍🍳', accent: '#C7A17A', next: 'Fertig',   nextAccent: '#b8906a', nextTextColor: '#fff', isTable: true, filterFn: o => o.order_type === 'in-store' },
  { status: 'ready',     label: 'ZUM TISCH',      emoji: '🍽️', accent: '#C7A17A', next: 'Serviert', nextAccent: '#b8906a', nextTextColor: '#111', isTable: true, filterFn: o => o.order_type === 'in-store' }
]

const NEXT: Record<string, OrderStatus> = { pending: 'preparing', preparing: 'ready', ready: 'delivered' }
const PREV: Record<string, OrderStatus> = { preparing: 'pending', ready: 'preparing' }
const IS_TABLE_COL = (col: ColumnDef) => !!col.isTable

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return <span style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: 2 }}>{t}</span>
}

function OrderCard({ order, col, onUpdate, onPrint, onNoShow }: {
  order: OrderWithItems
  col: ColumnDef
  onUpdate: (id: string, s: OrderStatus) => void
  onPrint: (order: OrderWithItems, type: 'drive-in' | 'ready') => void
  onNoShow?: (orderId: string) => void
}) {
  const [pending, startT] = useTransition()
  const [pressed, setPressed] = useState(false)
  const [noShowConfirm, setNoShowConfirm] = useState(false)
  const items = Array.isArray(order.order_items) ? order.order_items : []
  const addr = (order as OrderWithItems & { delivery_address?: string | null }).delivery_address
  const tableNum = (order as OrderWithItems & { table_number?: string | null }).table_number
  const pickupSlot = (order as OrderWithItems & { pickup_slot?: string | null }).pickup_slot
  const isTableOrder = order.order_type === 'in-store'
  const isTableCol = IS_TABLE_COL(col)

  // For table-column cards: show table number prominently, others show type label
  const typeLabel =
    order.order_type === 'delivery' ? '🚴 LIEFERUNG' :
    order.order_type === 'takeaway' ? '🛍 ABHOLUNG'  : null

  const typeBg =
    order.order_type === 'delivery' ? 'rgba(245,158,11,0.15)' :
    order.order_type === 'takeaway' ? 'rgba(96,165,250,0.15)' :
    'rgba(199,161,122,0.12)'
  const typeColor =
    order.order_type === 'delivery' ? '#fbbf24' :
    order.order_type === 'takeaway' ? '#93c5fd' : '#C7A17A'

  const isReady = order.status === 'ready'

  const handleTap = () => {
    const n = NEXT[order.status ?? '']
    if (n && !pending) startT(() => onUpdate(order.id, n))
  }

  const isPending = col.status === 'pending'
  const cardBorder = isPending
    ? col.accent
    : isTableCol
      ? 'rgba(199,161,122,0.35)'
      : 'rgba(255,255,255,0.1)'

  const cardBackground = pressed
    ? (isTableCol ? '#2a201a' : '#2a2a2a')
    : (isTableCol ? '#1f1810' : '#1c1c1c')

  return (
    <div
      onPointerDown={() => !isReady && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={!isReady ? handleTap : undefined}
      style={{
        background: cardBackground,
        borderRadius: 16,
        border: `2px solid ${cardBorder}`,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        cursor: isReady ? 'default' : 'pointer',
        transition: 'transform 0.08s, background 0.08s',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        boxShadow: isPending
          ? `0 0 24px ${col.accent}35`
          : isTableCol
            ? '0 2px 20px rgba(199,161,122,0.15)'
            : '0 2px 16px rgba(0,0,0,0.5)',
        animation: isPending ? 'cardPulse 2.2s ease-in-out infinite' : 'none',
        userSelect: 'none',
        opacity: pending ? 0.7 : 1,
        minHeight: 100,
        flexShrink: 0,
      }}
    >
      {/* Colored stripe top */}
      <div style={{ height: 5, background: col.accent, flexShrink: 0, borderRadius: '14px 14px 0 0' }} />

      {/* HEADER ROW: type label / table badge + order number + tap indicator */}
      <div style={{ padding: '12px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* In-store: large table badge */}
          {isTableOrder ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(199,161,122,0.15)',
              border: '1.5px solid rgba(199,161,122,0.5)',
              borderRadius: 10, padding: '6px 14px',
              fontSize: tableNum ? 18 : 15,
              fontWeight: 900,
              color: '#C7A17A',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}>
              🪑 {tableNum ? `Tisch ${tableNum}` : 'VOR ORT'}
            </div>
          ) : typeLabel ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              background: typeBg, color: typeColor,
              border: `1.5px solid ${typeColor}60`,
              borderRadius: 8, padding: '5px 14px',
              fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
            }}>
              {typeLabel}
            </div>
          ) : (
            <div style={{ height: 30 }} />
          )}
        </div>
        {/* Order number + time + tap indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, fontFamily: 'monospace' }}>
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
            {pending ? '⏳' : `→ ${col.next}`}
          </span>
        </div>
      </div>

      {/* ITEMS — the main content, always fully visible */}
      <div style={{ padding: '4px 14px 8px' }}>
        {items.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontStyle: 'italic', paddingTop: 4 }}>
            Keine Artikel
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item) => {
              const opts = Array.isArray(item.order_item_options) ? item.order_item_options : []
              return (
                <div key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: col.accent, lineHeight: 1, minWidth: 32 }}>
                      {item.quantity}×
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                      {item.item_name ?? '—'}
                    </span>
                  </div>
                  {/* M28: Gewählte Optionen */}
                  {opts.length > 0 && (
                    <div style={{ paddingLeft: 40, display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {opts.map(o => (
                        <span key={o.id} style={{
                          fontSize: 11, fontWeight: 700, color: '#C7A17A',
                          background: 'rgba(199,161,122,0.12)', border: '1px solid rgba(199,161,122,0.25)',
                          borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap',
                        }}>
                          {o.option_name}{o.price_cents > 0 ? ` +${(o.price_cents/100).toFixed(2).replace('.',',')}€` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* M28: Kundennotiz */}
                  {item.customer_note && (
                    <div style={{
                      paddingLeft: 40, marginTop: 3,
                      fontSize: 12, fontWeight: 600, color: '#fbbf24',
                      background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                      borderRadius: 6, padding: '3px 8px 3px 8px', display: 'inline-block',
                      marginLeft: 40, lineHeight: 1.4,
                    }}>
                      📝 {item.customer_note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delivery address */}
      {order.order_type === 'delivery' && addr && (
        <div style={{ margin: '0 14px', padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, flexShrink: 0 }}>
          📍 {addr}
        </div>
      )}

      {/* M24: Pickup slot */}
      {pickupSlot && (
        <div style={{ margin: '0 14px 6px', padding: '6px 10px', background: 'rgba(199,161,122,0.08)', border: '1px solid rgba(199,161,122,0.25)', borderRadius: 8, fontSize: 13, color: '#C7A17A', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          🕐 {pickupSlot}
        </div>
      )}

      {/* Zahlungsart — immer anzeigen */}
      {(() => {
        const payStatus = (order as OrderWithItems & { payment_status?: string | null }).payment_status
        if (payStatus === 'paid') return (
          <div style={{ margin: '0 14px 6px', padding: '5px 10px', background: 'rgba(99,91,255,0.1)', border: '1px solid rgba(99,91,255,0.3)', borderRadius: 8, fontSize: 12, color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>
            💳 Online bezahlt
          </div>
        )
        // Barzahlung (null, unpaid) — fehlgeschlagene Zahlungen tauchen nicht im KDS auf
        return (
          <div style={{ margin: '0 14px 6px', padding: '5px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>
            💵 Barzahlung
          </div>
        )
      })()}

      {/* M27b: Drive-In Ankunft */}
      {order.drive_in_arrived_at && (
        <div style={{
          margin: '0 14px 10px',
          padding: '10px 12px',
          background: 'linear-gradient(135deg, rgba(199,161,122,0.15), rgba(212,168,112,0.08))',
          border: '2px solid rgba(199,161,122,0.6)',
          borderRadius: 10,
          flexShrink: 0,
          animation: 'driveInPulse 2s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>🚗</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#C7A17A', letterSpacing: '0.03em' }}>
              KUNDE IST DA!
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f0f0', letterSpacing: '1.5px', fontFamily: 'monospace' }}>
            {order.drive_in_license_plate ?? '—'}
          </div>
          {order.drive_in_location_hint && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
              📍 {order.drive_in_location_hint}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'rgba(199,161,122,0.5)', marginTop: 4 }}>
            {new Date(order.drive_in_arrived_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
          </div>
        </div>
      )}

      {/* BON DRUCKEN + STATUS Buttons (bei Status = ready — Karte ist nicht klickbar) */}
      {isReady && (
        <div style={{ padding: '6px 14px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => onPrint(order, 'ready')}
            style={{
              width: '100%', padding: '10px 0',
              background: 'rgba(52,211,153,0.12)', border: '1.5px solid rgba(52,211,153,0.4)',
              borderRadius: 10, color: '#34d399', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            🖨️ Bon drucken / PDF
          </button>
          {order.drive_in_arrived_at && (
            <button
              onClick={() => onPrint(order, 'drive-in')}
              style={{
                width: '100%', padding: '10px 0',
                background: 'rgba(199,161,122,0.1)', border: '1.5px solid rgba(199,161,122,0.4)',
                borderRadius: 10, color: '#C7A17A', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              🖨️ Drive-In Bon
            </button>
          )}
          <button
            onClick={() => { if (!pending) startT(() => onUpdate(order.id, 'delivered' as OrderStatus)) }}
            style={{
              width: '100%', padding: '10px 0',
              background: col.nextAccent, color: col.nextTextColor,
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pending ? 0.6 : 1,
            }}
          >
            → {col.next}
          </button>
          {/* Zurück-Button */}
          {PREV[order.status ?? ''] && (
            <button
              onClick={() => { if (!pending) startT(() => onUpdate(order.id, PREV[order.status ?? '']!)) }}
              style={{
                width: '100%', padding: '7px 0',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                opacity: pending ? 0.4 : 1,
              }}
            >
              ↩ Zurück
            </button>
          )}
        </div>
      )}

      {/* Drive-In Bon Button (für andere Status — nicht ready) */}
      {!isReady && order.drive_in_arrived_at && (
        <div style={{ padding: '0 14px 12px', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onPrint(order, 'drive-in') }}
            style={{
              width: '100%', padding: '9px 0',
              background: 'rgba(199,161,122,0.1)', border: '1.5px solid rgba(199,161,122,0.4)',
              borderRadius: 10, color: '#C7A17A', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            🖨️ Drive-In Bon
          </button>
        </div>
      )}

      {/* Zurück-Button für nicht-ready Karten (z.B. preparing → pending) */}
      {!isReady && PREV[order.status ?? ''] && (
        <div style={{ padding: '0 14px 8px', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); if (!pending) startT(() => onUpdate(order.id, PREV[order.status ?? '']!)) }}
            style={{
              width: '100%', padding: '6px 0',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              opacity: pending ? 0.4 : 1,
            }}
          >
            ↩ Zurück
          </button>
        </div>
      )}

      {/* Nicht abgeholt — nur bei Barzahlung + 'ready' Status */}
      {col.status === 'ready' && onNoShow && order.user_id && !order.no_show && !(order as OrderWithItems & { payment_status?: string | null }).payment_status?.match(/^paid$/) && (
        <div style={{ padding: '0 14px 12px', flexShrink: 0 }}>
          {!noShowConfirm ? (
            <button
              onClick={(e) => { e.stopPropagation(); setNoShowConfirm(true) }}
              style={{
                width: '100%', padding: '8px 0',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 10, color: '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              ⚠️ Nicht abgeholt
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setNoShowConfirm(false); onNoShow(order.id) }}
                style={{
                  flex: 1, padding: '8px 0',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, color: '#f87171', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                }}
              >
                ⛔ Ja, Kunde sperren
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setNoShowConfirm(false) }}
                style={{
                  flex: 1, padding: '8px 0',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#9ca3af', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}
      {order.no_show && (
        <div style={{ padding: '0 14px 12px', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#f87171', fontWeight: 700, textAlign: 'center', padding: '6px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
            🚫 Nicht abgeholt — Kunde gesperrt
          </p>
        </div>
      )}

    </div>
  )
}

function PortraitOverlay() {
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])
  if (!portrait) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 32 }}>
      <RotateCcw style={{ width: 52, height: 52, color: '#f59e0b', animation: 'spin 3s linear infinite' }} />
      <p style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>Bitte Gerät drehen</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Der Küchen-Monitor ist für Landscape optimiert.</p>
    </div>
  )
}

export default function KitchenDisplayFullscreen({ projectId, projectName, inStoreEnabled = false }: { projectId: string; projectName: string; inStoreEnabled?: boolean }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [conn, setConn] = useState<ConnectionStatus>('CONNECTING')
  const [fullscreen, setFullscreen] = useState(false)
  const [bonHtml, setBonHtml] = useState<string | null>(null)  // Bon-Vorschau für Druck
  const prevPending = useRef(0)
  const audioRef = useRef<AudioContext | null>(null)
  // IDs von Orders die gerade server-seitig gespeichert werden (verhindert Poll-Überschreibung)
  const updatingRef = useRef<Set<string>>(new Set())

  const supabaseRef = useRef(createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
  const supabase = supabaseRef.current

  // ── Bon HTML Generator ────────────────────────────────────────────────────────────
  const buildBonHtml = useCallback((order: OrderWithItems, type: 'drive-in' | 'ready') => {
    const items = Array.isArray(order.order_items) ? order.order_items : []
    const total = items.reduce((s, i) => s + i.price_at_time * i.quantity, 0)
    const now = new Date()
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const orderTypeLabel =
      order.order_type === 'delivery' ? '🚴 Lieferung' :
      order.order_type === 'takeaway' ? '🛍 Abholung'  :
      order.order_type === 'in-store' ? '🪑 Vor Ort'   : ''

    const pickupSlot = (order as OrderWithItems & { pickup_slot?: string | null }).pickup_slot
    const driveInPlate = order.drive_in_license_plate
    const driveInHint  = order.drive_in_location_hint

    const driveInBlock = type === 'drive-in' ? `
      <hr style="border:1px dashed #000;margin:6px 0">
      <p style="font-weight:bold;text-align:center;margin:4px 0">🚗 DRIVE-IN ANKUNFT</p>
      <p style="font-size:1.4em;font-weight:bold;text-align:center;letter-spacing:3px;border:2px solid #000;padding:4px;margin:4px 0">${driveInPlate ?? '—'}</p>
      ${driveInHint ? `<p style="text-align:center;margin:2px 0">📍 ${driveInHint}</p>` : ''}
    ` : ''

    const tableNum = (order as OrderWithItems & { table_number?: string | null }).table_number
    const tableBlock = (order.order_type === 'in-store' && tableNum) ? `
        <div style="font-size:1.3em;font-weight:bold;text-align:center;border:2px solid #000;padding:4px;margin:6px 0;letter-spacing:2px">🪑 TISCH ${tableNum}</div>
    ` : ''

    return `
      <div style="font-family:'Courier New',monospace;font-size:13pt;max-width:300px;margin:0 auto;color:#000;background:#fff;padding:8px">
        <div style="font-size:1.4em;font-weight:bold;text-align:center;margin-bottom:4px">${projectName}</div>
        <div style="text-align:center;color:#444;margin-bottom:6px">${type === 'drive-in' ? 'Drive-In Lieferschein' : orderTypeLabel}</div>
        <hr style="border:1px dashed #000;margin:6px 0">
        <div style="display:flex;justify-content:space-between"><span>Datum</span><span>${dateStr}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Uhrzeit</span><span>${timeStr}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Bestellung</span><span>#${order.id.slice(0,8).toUpperCase()}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Kunde</span><span>${order.customer_name ?? '—'}</span></div>
        ${order.order_type === 'delivery' && order.customer_contact && !order.customer_contact.includes('@') ? `<div style="display:flex;justify-content:space-between"><span>Telefon</span><span style="font-weight:bold">${order.customer_contact}</span></div>` : ''}
        ${pickupSlot ? `<div style="display:flex;justify-content:space-between"><span>Abholzeit</span><span>${pickupSlot}</span></div>` : ''}
        ${order.order_type === 'delivery' && (order as OrderWithItems & { delivery_address?: string | null }).delivery_address ? `
          <hr style="border:1px dashed #000;margin:6px 0">
          <div style="font-weight:bold;text-align:center;margin:4px 0">📍 LIEFERADRESSE</div>
          <div style="text-align:center;font-size:1.1em;border:2px solid #000;padding:6px;margin:4px 0;font-weight:bold">${(order as OrderWithItems & { delivery_address?: string | null }).delivery_address}</div>
        ` : ''}
        ${tableBlock}
        ${driveInBlock}
        <hr style="border:1px dashed #000;margin:6px 0">
        <div style="font-weight:bold;text-align:center;margin:4px 0">BESTELLUNG</div>
        ${items.map(i => {
          const opts = Array.isArray((i as OrderItem).order_item_options) ? (i as OrderItem).order_item_options! : []
          const optsHtml = opts.map(o => `<div style="padding-left:20px;font-size:0.85em;color:#555">→ ${o.option_name}${o.price_cents > 0 ? ` (+${(o.price_cents/100).toFixed(2).replace('.',',')} €)` : ''}</div>`).join('')
          const noteHtml = (i as OrderItem).customer_note ? `<div style="padding-left:20px;font-size:0.85em;font-weight:bold;border:1px solid #999;border-radius:4px;padding:2px 6px;margin:2px 0 2px 20px;display:inline-block">📝 ${(i as OrderItem).customer_note}</div>` : ''
          return `<div style="display:flex;justify-content:space-between"><span>${i.quantity}× ${i.item_name ?? '—'}</span><span>${((i.price_at_time * i.quantity)/100).toFixed(2).replace('.',',')} €</span></div>${optsHtml}${noteHtml}`
        }).join('')}
        <hr style="border:1px dashed #000;margin:6px 0">
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.2em"><span>GESAMT</span><span>${(total/100).toFixed(2).replace('.',',')} €</span></div>
        <hr style="border:1px dashed #000;margin:6px 0">
        <div style="text-align:center;margin-top:6px;font-weight:bold">Wir wünschen Guten Appetit! 🍱</div>
      </div>
    `
  }, [projectName])

  // ── Manueller Druck (Modal) ──────────────────────────────────────────────────────
  const printBon = useCallback((order: OrderWithItems, type: 'drive-in' | 'ready') => {
    setBonHtml(buildBonHtml(order, type))
  }, [buildBonHtml])

  // ── Automatischer Druck (Modal + Auto window.print()) ────────────────────────────
  const printedOrdersRef = useRef<Set<string>>(new Set())

  const autoPrintBon = useCallback((order: OrderWithItems, type: 'drive-in' | 'ready') => {
    const printKey = `${order.id}-${type}`
    if (printedOrdersRef.current.has(printKey)) return
    printedOrdersRef.current.add(printKey)

    // Modal öffnen mit Bon-Vorschau, dann auto-drucken
    setBonHtml(buildBonHtml(order, type))
    setTimeout(() => window.print(), 600)
  }, [buildBonHtml])

  const playAlert = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      const ctx = audioRef.current
      // Browser Autoplay Policy: AudioContext muss resumed werden
      if (ctx.state === 'suspended') void ctx.resume()
      ;[880, 1100, 880].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.12)
        o.start(ctx.currentTime + i * 0.15)
        o.stop(ctx.currentTime + i * 0.15 + 0.12)
      })
    } catch { /* blocked */ }
  }, [])

  const [lastFetch, setLastFetch] = useState(Date.now())

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('orders')
      .select('*, order_items(id, quantity, price_at_time, item_name, customer_note, order_item_options(id, option_name, option_group_name, price_cents))')
      .eq('project_id', projectId)
      .in('status', ['pending', 'preparing', 'ready'])
      // Nur blockieren wenn payment_status = 'pending' (Kartenzahlung noch offen)
      // null = Barzahlung, 'unpaid' = Barzahlung (alt), 'paid' = Karte bestätigt
      .or('payment_status.is.null,payment_status.eq.paid,payment_status.eq.unpaid')
      .order('created_at', { ascending: true })
    if (data) {
      const newOrders = data as OrderWithItems[]
      const np = newOrders.filter(o => o.status === 'pending').length
      if (np > prevPending.current) {
        playAlert()
        // Auto-Print für neue Bestellungen (nur pending = gerade eingegangen)
        const newPending = newOrders.filter(o => o.status === 'pending')
        for (const order of newPending) {
          autoPrintBon(order, 'ready')
        }
      }
      prevPending.current = np
      // Für Orders die gerade gespeichert werden: lokalen (optimistischen) Status behalten
      setOrders(prev => {
        const localMap = new Map(prev.map(o => [o.id, o]))
        return newOrders.map(o =>
          updatingRef.current.has(o.id) && localMap.has(o.id)
            ? { ...o, status: localMap.get(o.id)!.status }
            : o
        )
      })
      setLastFetch(Date.now())
    }
  }, [projectId, supabase, playAlert, autoPrintBon])

  useEffect(() => {
    void fetch()

    // Realtime für sofortige Updates
    const ch = supabase.channel(`kds-fs-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `project_id=eq.${projectId}` }, (payload) => {

        // Realtime Events: Drive-In Ankunft + Status → ready
        if (payload.eventType === 'UPDATE') {
          const newRow = payload.new as { id: string; drive_in_arrived_at: string | null; status: string | null }
          const oldRow = payload.old as { drive_in_arrived_at: string | null; status: string | null }

          const fetchAndPrint = async (bonType: 'drive-in' | 'ready') => {
            const { data: fullOrder } = await supabase
              .from('orders')
              .select('*, order_items(id, quantity, price_at_time, item_name, customer_note, order_item_options(id, option_name, option_group_name, price_cents))')
              .eq('id', newRow.id)
              .single()
            if (fullOrder) autoPrintBon(fullOrder as OrderWithItems, bonType)
          }

          // Drive-In Ankunft
          if (newRow.drive_in_arrived_at && !oldRow.drive_in_arrived_at) {
            setTimeout(() => void fetchAndPrint('drive-in'), 200)
          }
          // Bestellung → Bereit (von küche markiert)
          else if (newRow.status === 'ready' && oldRow.status !== 'ready') {
            setTimeout(() => void fetchAndPrint('ready'), 200)
          }
        }
        // 150ms Delay: wartet auf order_items INSERT bevor wir fetchen
        setTimeout(() => void fetch(), 150)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { void fetch() })
      .subscribe(s => {
        if (s === 'SUBSCRIBED') setConn('ONLINE')
        if (s === 'CHANNEL_ERROR' || s === 'CLOSED') setConn('OFFLINE')
      })

    // Polling alle 10s als zuverlässiger Fallback
    const poll = setInterval(() => { void fetch() }, 10_000)

    return () => {
      clearInterval(poll)
      void supabase.removeChannel(ch)
    }
  }, [projectId, supabase, fetch])


  const toggleFS = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
  }
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const handleUpdate = async (id: string, s: OrderStatus) => {
    // Optimistisch updaten + ID als "in Bearbeitung" markieren
    updatingRef.current.add(id)
    setOrders(cur => cur.map(o => o.id === id ? { ...o, status: s } : o))
    try {
      await updateOrderStatus(id, projectId, s)
    } finally {
      // Nach Server-Antwort: wieder freigeben + aktuellen DB-Stand laden
      updatingRef.current.delete(id)
      void fetch()
    }
  }

  const handleNoShow = async (orderId: string) => {
    const result = await reportNoShow(orderId)
    if (result.success) {
      // Optimistisch markieren
      setOrders(cur => cur.map(o => o.id === orderId ? { ...o, no_show: true } : o))
    }
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const totalActive = orders.length

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 14px rgba(245,158,11,0.25); border-color: rgba(245,158,11,0.6); }
          50%       { box-shadow: 0 0 32px rgba(245,158,11,0.55); border-color: rgba(245,158,11,1.0); }
        }
        @keyframes alertPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        @keyframes driveInPulse {
          0%, 100% { border-color: rgba(199,161,122,0.6); box-shadow: 0 0 10px rgba(199,161,122,0.2); }
          50%       { border-color: rgba(199,161,122,1.0); box-shadow: 0 0 22px rgba(199,161,122,0.5); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <PortraitOverlay />

      {/* ── Bon-Druck Modal ─────────────────────────────────────── */}
      {bonHtml && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #bon-print-modal,
              #bon-print-modal * { visibility: visible !important; }
              #bon-print-modal {
                position: fixed !important; top: 0 !important; left: 0 !important;
                width: 100% !important; height: auto !important;
                background: #fff !important; padding: 0 !important;
                display: block !important;
              }
              #bon-print-buttons { display: none !important; }
              @page { margin: 0; size: 80mm auto; }
            }
          `}</style>
          <div
            id="bon-print-modal"
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 16,
            }}
          >
            {/* Bon preview */}
            <div
              dangerouslySetInnerHTML={{ __html: bonHtml }}
              style={{
                background: '#fff', borderRadius: 8,
                padding: 16, maxWidth: 320, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
            {/* Buttons */}
            <div id="bon-print-buttons" style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { window.print() }}
                style={{
                  padding: '12px 28px', background: '#34d399', color: '#000',
                  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🖨️ Drucken / Als PDF
              </button>
              <button
                onClick={() => setBonHtml(null)}
                style={{
                  padding: '12px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                  fontSize: 15, cursor: 'pointer',
                }}
              >
                ✕ Schließen
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden' }}>

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, gap: 12 }}>

          {/* Left: logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#1e1e1e', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <ChefHat style={{ width: 18, height: 18, color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{projectName}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kitchen Display</div>
            </div>
          </div>

          {/* Center: pending alert + clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {pendingCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 20, padding: '5px 16px', color: '#f59e0b', fontSize: 14, fontWeight: 700, animation: 'alertPulse 1.5s ease-in-out infinite' }}>
                <Bell style={{ width: 15, height: 15 }} />
                {pendingCount} neue{pendingCount > 1 ? '' : 'r'} Auftrag{pendingCount > 1 ? 'räge' : ''}
              </div>
            )}
            <LiveClock />
          </div>

          {/* Right: active count + conn + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 12px' }}>
              {totalActive} aktiv
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid', ...(conn === 'ONLINE' ? { background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' } : conn === 'CONNECTING' ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' } : { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }) }}>
              {conn === 'ONLINE' && <Wifi style={{ width: 12, height: 12 }} />}
              {conn === 'CONNECTING' && <RefreshCw style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />}
              {conn === 'OFFLINE' && <WifiOff style={{ width: 12, height: 12 }} />}
              {conn === 'ONLINE' ? 'Live' : conn === 'CONNECTING' ? '…' : 'Offline'}
            </div>
            {lastFetch > 0 && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
                ↻ {Math.round((Date.now() - lastFetch) / 1000)}s
              </div>
            )}
            <button onClick={() => void fetch()} title="Manuell aktualisieren" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <RefreshCw style={{ width: 12, height: 12 }} />
            </button>
            <a href={`/dashboard/project/${projectId}/orders`} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
              <LayoutDashboard style={{ width: 12, height: 12 }} />
            </a>
            <button onClick={toggleFS} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              {fullscreen ? <Minimize2 style={{ width: 12, height: 12 }} /> : <Maximize2 style={{ width: 12, height: 12 }} />}
            </button>
          </div>
        </div>

        {/* ── Dynamic Layout ──────────────────────────────────────────── */}
        {inStoreEnabled ? (
          (() => {
            const onlineOrders = orders.filter(o => o.order_type !== 'in-store' && ['pending','preparing','ready'].includes(o.status ?? ''))
            const tableOrders = orders.filter(o => o.order_type === 'in-store' && ['pending','preparing','ready'].includes(o.status ?? ''))
            const hasOnline = onlineOrders.length > 0
            const hasTable = tableOrders.length > 0
            // Dynamic flex: empty section gets minimal space
            const onlineFlex = hasOnline ? (hasTable ? 1 : 3) : (hasTable ? 0 : 1)
            const tableFlex = hasTable ? (hasOnline ? 2 : 3) : (hasOnline ? 0 : 1)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* ROW 1: Online Orders — collapses when empty */}
                {(hasOnline || !hasTable) && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: onlineFlex, minHeight: hasOnline ? 0 : 80, borderBottom: '2px solid rgba(255,255,255,0.08)', transition: 'flex 0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                      <span style={{ fontSize: 14 }}>🚴</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Außer Haus</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1, minHeight: 0 }}>
                      {getOnlineColumns().map((col, ci) => renderColumn(col, ci, 3, orders, handleUpdate, printBon, handleNoShow))}
                    </div>
                  </div>
                )}

                {/* ROW 2: In-Store Orders — grows when Online is empty */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: tableFlex, minHeight: hasTable ? 0 : 80, background: 'rgba(199,161,122,0.02)', transition: 'flex 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 20px', background: 'rgba(199,161,122,0.08)', borderBottom: '1px solid rgba(199,161,122,0.15)', flexShrink: 0 }}>
                    <span style={{ fontSize: 14 }}>🪑</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#C7A17A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tischbestellungen</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1, minHeight: 0 }}>
                    {getTableColumns().map((col, ci) => renderColumn(col, ci, 3, orders, handleUpdate, printBon, handleNoShow))}
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1, minHeight: 0 }}>
            {getStandardColumns().map((col, ci) => renderColumn(col, ci, 3, orders, handleUpdate, printBon, handleNoShow))}
          </div>
        )}
      </div>
    </>
  )
}

function renderColumn(
  col: ColumnDef,
  ci: number,
  totalCols: number,
  allOrders: OrderWithItems[],
  handleUpdate: (id: string, s: OrderStatus) => void,
  onPrint: (order: OrderWithItems, type: 'drive-in' | 'ready') => void,
  handleNoShow?: (orderId: string) => void
) {
  let colOrders = allOrders.filter(o => o.status === col.status)
  if (col.filterFn) colOrders = colOrders.filter(col.filterFn)
  const isTableColumn = IS_TABLE_COL(col)

  return (
    <div
      key={`${col.status}-${col.label}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRight: ci < totalCols - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
        minHeight: 0,
        background: isTableColumn ? 'rgba(199,161,122,0.02)' : 'transparent',
      }}
    >
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
        background: isTableColumn ? 'rgba(199,161,122,0.06)' : `${col.accent}12`,
        borderBottom: `2px solid ${isTableColumn ? 'rgba(199,161,122,0.3)' : `${col.accent}45`}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>{col.emoji}</span>
        <span style={{
          fontSize: 13, fontWeight: 800, color: col.accent,
          textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1,
        }}>{col.label}</span>
        <span style={{
          fontSize: 15, fontWeight: 900, color: col.accent,
          background: `${col.accent}20`, border: `1.5px solid ${col.accent}50`,
          borderRadius: 20, padding: '1px 12px', minWidth: 30, textAlign: 'center',
        }}>
          {colOrders.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {colOrders.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: isTableColumn ? 'rgba(199,161,122,0.2)' : 'rgba(255,255,255,0.1)', paddingTop: 40 }}>
            <span style={{ fontSize: 38, opacity: 0.2 }}>{col.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Keine Aufträge</span>
          </div>
        ) : colOrders.map(order => (
          <OrderCard key={order.id} order={order} col={col} onUpdate={handleUpdate} onPrint={onPrint} onNoShow={handleNoShow} />
        ))}
      </div>
    </div>
  )
}
