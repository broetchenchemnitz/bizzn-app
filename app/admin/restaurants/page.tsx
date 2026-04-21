'use client'

import { useEffect, useState } from 'react'
import {
  getAdminRestaurants,
  adminSuspendRestaurant,
  adminReactivateRestaurant,
  adminSetSubscriptionPaidUntil,
  adminUpdateSlug,
  adminApproveProject,
  adminRejectProject,
  adminSetCustomPrice,
  type AdminRestaurant,
} from '@/app/actions/admin-actions'

const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`

const PRICE_PRESETS = [
  { label: '0 € (Gratis)', value: 0 },
  { label: '49 €', value: 4900 },
  { label: '99 €', value: 9900 },
  { label: '149 €', value: 14900 },
]

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'Entwurf',    color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
  pending_review: { label: '⏳ In Prüfung', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  approved:       { label: '✓ Freigegeben', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  active:         { label: '● Live',     color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  inactive:       { label: '◌ Offline', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'overdue' | 'pending'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [suspendModal, setSuspendModal] = useState<AdminRestaurant | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [approveModal, setApproveModal] = useState<AdminRestaurant | null>(null)
  const [rejectModal, setRejectModal] = useState<AdminRestaurant | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvePrice, setApprovePrice] = useState<number>(9900)
  const [approvePriceCustom, setApprovePriceCustom] = useState('')
  const [approveNote, setApproveNote] = useState('')
  const [priceMode, setPriceMode] = useState<'preset' | 'custom'>('preset')

  // Inline edits
  const [editPaidUntil, setEditPaidUntil] = useState<{ id: string; value: string } | null>(null)
  const [editSlug, setEditSlug] = useState<{ id: string; value: string } | null>(null)
  const [editPrice, setEditPrice] = useState<{ id: string; value: string } | null>(null)
  const [slugError, setSlugError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = () => {
    setLoading(true)
    getAdminRestaurants(filter as Parameters<typeof getAdminRestaurants>[0], search)
      .then(setRestaurants)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const pendingCount = restaurants.filter(r => r.projectStatus === 'pending_review').length

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSuspend = async () => {
    if (!suspendModal || !suspendReason.trim()) return
    setActionLoading(true)
    const result = await adminSuspendRestaurant(suspendModal.id, suspendReason.trim())
    if (result.success) { setSuspendModal(null); setSuspendReason(''); load() }
    setActionLoading(false)
  }

  const handleReactivate = async (id: string) => {
    setActionLoading(true)
    const result = await adminReactivateRestaurant(id)
    if (result.success) load()
    setActionLoading(false)
  }

  const handleApprove = async () => {
    if (!approveModal) return
    setActionLoading(true)
    const price = priceMode === 'custom'
      ? Math.round(parseFloat(approvePriceCustom.replace(',', '.')) * 100)
      : approvePrice
    const result = await adminApproveProject(approveModal.id, isNaN(price) ? 9900 : price, approveNote || undefined)
    if (result.success) { setApproveModal(null); setApproveNote(''); load() }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    setActionLoading(true)
    const result = await adminRejectProject(rejectModal.id, rejectReason.trim())
    if (result.success) { setRejectModal(null); setRejectReason(''); load() }
    setActionLoading(false)
  }

  const handleSavePaidUntil = async () => {
    if (!editPaidUntil) return
    setActionLoading(true)
    const result = await adminSetSubscriptionPaidUntil(editPaidUntil.id, editPaidUntil.value || null)
    if (result.success) { setEditPaidUntil(null); load() }
    setActionLoading(false)
  }

  const handleSaveSlug = async () => {
    if (!editSlug) return
    setActionLoading(true)
    setSlugError('')
    const result = await adminUpdateSlug(editSlug.id, editSlug.value)
    if (result.success) { setEditSlug(null); load() }
    else setSlugError(result.error ?? 'Fehler')
    setActionLoading(false)
  }

  const handleSavePrice = async () => {
    if (!editPrice) return
    setActionLoading(true)
    const cents = Math.round(parseFloat(editPrice.value.replace(',', '.')) * 100)
    const result = await adminSetCustomPrice(editPrice.id, isNaN(cents) ? null : cents)
    if (result.success) { setEditPrice(null); load() }
    setActionLoading(false)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Restaurants</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{restaurants.length} Einträge</p>
        </div>
        {pendingCount > 0 && filter !== 'pending' && (
          <button
            onClick={() => setFilter('pending')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)', color: '#d97706', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ⏳ {pendingCount} warten auf Freigabe
          </button>
        )}
      </div>

      {/* Filter + Suche */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {([
            { key: 'all' as const, label: 'Alle' },
            { key: 'pending' as const, label: '⏳ In Prüfung' },
            { key: 'active' as const, label: '✓ Aktiv' },
            { key: 'overdue' as const, label: '⚠️ Offen' },
            { key: 'suspended' as const, label: '🚫 Gesperrt' },
          ]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              border: `1px solid ${filter === f.key ? '#3b82f6' : '#e5e7eb'}`,
              background: filter === f.key ? 'rgba(59,130,246,0.08)' : '#fff',
              color: filter === f.key ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); load() }} style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '200px' }}>
          <input
            type="text" placeholder="Name oder E-Mail…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', color: '#111827', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #3b82f6', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Suchen</button>
        </form>
      </div>

      {/* Tabelle */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={thStyle}>Restaurant</th>
                  <th style={thStyle}>Slug</th>
                  <th style={thStyle}>Inhaber</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Preis/Monat</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Kunden</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Bestellungen</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Umsatz</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map(r => {
                  const statusInfo = STATUS_LABELS[r.projectStatus] ?? STATUS_LABELS['draft']
                  const isPending = r.projectStatus === 'pending_review'

                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid #f3f4f6', background: isPending ? 'rgba(245,158,11,0.03)' : undefined }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseOut={e => (e.currentTarget.style.background = isPending ? 'rgba(245,158,11,0.03)' : '#fff')}
                    >
                      {/* Name */}
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{r.name}</span>
                        <br />
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{r.id.slice(0, 8)}</span>
                      </td>

                      {/* Slug */}
                      <td style={tdStyle}>
                        {editSlug?.id === r.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" value={editSlug.value} onChange={e => setEditSlug({ ...editSlug, value: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') handleSaveSlug() }}
                              style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '11px', width: '120px', fontFamily: 'monospace' }} autoFocus />
                            <button onClick={handleSaveSlug} disabled={actionLoading} style={btnSaveStyle}>✓</button>
                            <button onClick={() => { setEditSlug(null); setSlugError('') }} style={btnCancelStyle}>✕</button>
                            {slugError && <span style={{ fontSize: '10px', color: '#ef4444' }}>{slugError}</span>}
                          </div>
                        ) : (
                          <span onClick={() => { setEditSlug({ id: r.id, value: r.slug ?? '' }); setSlugError('') }}
                            style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 500, background: r.slug ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)', color: r.slug ? '#3b82f6' : '#9ca3af', border: `1px dashed ${r.slug ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.25)'}` }} title="Klick zum Bearbeiten">
                            {r.slug ?? '— setzen'}
                          </span>
                        )}
                      </td>

                      {/* Inhaber */}
                      <td style={tdStyle}><span style={{ color: '#6b7280', fontSize: '12px' }}>{r.ownerEmail ?? '—'}</span></td>

                      {/* Preis */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {editPrice?.id === r.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                            <input type="text" value={editPrice.value} onChange={e => setEditPrice({ ...editPrice, value: e.target.value })}
                              placeholder="z.B. 49" style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '11px', width: '70px', textAlign: 'center' }} />
                            <span style={{ fontSize: '10px', color: '#9ca3af' }}>€</span>
                            <button onClick={handleSavePrice} disabled={actionLoading} style={btnSaveStyle}>✓</button>
                            <button onClick={() => setEditPrice(null)} style={btnCancelStyle}>✕</button>
                          </div>
                        ) : (
                          <span onClick={() => setEditPrice({ id: r.id, value: r.customPriceCents != null ? String(r.customPriceCents / 100) : '' })}
                            style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: '#3b82f6', background: 'rgba(59,130,246,0.06)', border: '1px dashed rgba(59,130,246,0.2)' }} title="Klick zum Bearbeiten">
                            {r.customPriceCents != null ? eur(r.customPriceCents) + '/Mo' : '— setzen'}
                          </span>
                        )}
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{r.totalCustomers}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{r.totalOrders}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{eur(r.totalRevenue)}</td>

                      {/* Status */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color }}>
                          {r.isSuspended ? '🚫 Gesperrt' : statusInfo.label}
                        </span>
                      </td>

                      {/* Aktionen */}
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {isPending && (
                            <>
                              <button onClick={() => { setApproveModal(r); setApprovePrice(9900); setApprovePriceCustom(''); setApproveNote(''); setPriceMode('preset') }} style={btnGreenStyle}>
                                ✓ Freigeben
                              </button>
                              <button onClick={() => { setRejectModal(r); setRejectReason('') }} style={btnRedStyle}>
                                ✕ Ablehnen
                              </button>
                            </>
                          )}
                          {!isPending && (
                            r.isSuspended ? (
                              <button onClick={() => handleReactivate(r.id)} disabled={actionLoading} style={btnGreenStyle}>Aktivieren</button>
                            ) : (
                              <button onClick={() => { setSuspendModal(r); setSuspendReason('') }} style={btnRedStyle}>Sperren</button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Freigabe-Modal ───────────────────────────────────────────────────── */}
      {approveModal && (
        <div style={modalOverlay} onClick={() => setApproveModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: '460px' }}>
            <h3 style={modalTitle}>🎉 Restaurant freigeben</h3>
            <p style={modalSubtitle}><strong>{approveModal.name}</strong> — Bitte lege den monatlichen Preis fest.</p>

            {/* Preis-Presets */}
            <label style={labelStyle}>Monatlicher Preis *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {PRICE_PRESETS.map(p => (
                <button key={p.value} onClick={() => { setApprovePrice(p.value); setPriceMode('preset') }}
                  style={{ padding: '10px', borderRadius: '8px', border: `2px solid ${priceMode === 'preset' && approvePrice === p.value ? '#22c55e' : '#e5e7eb'}`, background: priceMode === 'preset' && approvePrice === p.value ? 'rgba(34,197,94,0.08)' : '#f9fafb', color: priceMode === 'preset' && approvePrice === p.value ? '#16a34a' : '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <button onClick={() => setPriceMode('custom')} style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid ${priceMode === 'custom' ? '#3b82f6' : '#e5e7eb'}`, background: priceMode === 'custom' ? 'rgba(59,130,246,0.06)' : '#f9fafb', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: priceMode === 'custom' ? '#3b82f6' : '#6b7280' }}>Individuell</button>
              {priceMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="text" value={approvePriceCustom} onChange={e => setApprovePriceCustom(e.target.value)}
                    placeholder="z.B. 75" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', width: '80px', fontSize: '13px', textAlign: 'center' }} />
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>€ / Monat</span>
                </div>
              )}
            </div>

            {/* Notiz */}
            <label style={labelStyle}>Notiz an Gastronom (optional)</label>
            <textarea value={approveNote} onChange={e => setApproveNote(e.target.value)} placeholder="z.B. Herzlich willkommen bei bizzn! ..." style={{ ...textareaStyle, minHeight: '60px' }} />

            <div style={modalActions}>
              <button onClick={() => setApproveModal(null)} style={btnOutline}>Abbrechen</button>
              <button onClick={handleApprove} disabled={actionLoading} style={{ ...btnGreenStyle, padding: '10px 24px', fontSize: '13px' }}>
                {actionLoading ? '…' : '✓ Jetzt freigeben'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ablehnen-Modal ──────────────────────────────────────────────────── */}
      {rejectModal && (
        <div style={modalOverlay} onClick={() => setRejectModal(null)}>
          <div onClick={e => e.stopPropagation()} style={modalBox}>
            <h3 style={modalTitle}>✕ Antrag ablehnen</h3>
            <p style={modalSubtitle}><strong>{rejectModal.name}</strong> wird zurück auf &quot;Entwurf&quot; gesetzt.</p>
            <label style={labelStyle}>Ablehnungsgrund *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="z.B. Unvollständige Speisekarte, Adresse fehlt…" style={textareaStyle} />
            <div style={modalActions}>
              <button onClick={() => setRejectModal(null)} style={btnOutline}>Abbrechen</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading} style={{ ...btnRedStyle, padding: '10px 24px', fontSize: '13px', opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                {actionLoading ? '…' : 'Ablehnen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sperr-Modal ────────────────────────────────────────────────────── */}
      {suspendModal && (
        <div style={modalOverlay} onClick={() => setSuspendModal(null)}>
          <div onClick={e => e.stopPropagation()} style={modalBox}>
            <h3 style={modalTitle}>Restaurant sperren</h3>
            <p style={modalSubtitle}><strong>{suspendModal.name}</strong> wird für Bestellungen gesperrt.</p>
            <label style={labelStyle}>Grund der Sperrung *</label>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="z.B. Offene Rechnung, Vertragsverletzung…" style={textareaStyle} />
            <div style={modalActions}>
              <button onClick={() => setSuspendModal(null)} style={btnOutline}>Abbrechen</button>
              <button onClick={handleSuspend} disabled={!suspendReason.trim() || actionLoading} style={{ ...btnRedStyle, padding: '10px 24px', fontSize: '13px', opacity: !suspendReason.trim() ? 0.5 : 1 }}>
                {actionLoading ? '…' : 'Sperren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }
const tdStyle: React.CSSProperties = { padding: '10px 14px', color: '#374151' }
const btnRedStyle: React.CSSProperties = { padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }
const btnGreenStyle: React.CSSProperties = { padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
const btnSaveStyle: React.CSSProperties = { padding: '3px 8px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }
const btnCancelStyle: React.CSSProperties = { padding: '3px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '10px', cursor: 'pointer' }
const btnOutline: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }
const modalTitle: React.CSSProperties = { fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 6px' }
const modalSubtitle: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }
const modalActions: React.CSSProperties = { display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }
const textareaStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', color: '#111827' }
