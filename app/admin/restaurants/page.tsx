'use client'

import { useEffect, useState } from 'react'
import { getAdminRestaurants, adminSuspendRestaurant, adminReactivateRestaurant, adminSetSubscriptionPaidUntil, adminUpdateSlug, type AdminRestaurant } from '@/app/actions/admin-actions'

const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'overdue'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [suspendModal, setSuspendModal] = useState<AdminRestaurant | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [editPaidUntil, setEditPaidUntil] = useState<{ id: string; value: string } | null>(null)
  const [editSlug, setEditSlug] = useState<{ id: string; value: string } | null>(null)
  const [slugError, setSlugError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = () => {
    setLoading(true)
    getAdminRestaurants(filter, search)
      .then(setRestaurants)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const handleSuspend = async () => {
    if (!suspendModal || !suspendReason.trim()) return
    setActionLoading(true)
    const result = await adminSuspendRestaurant(suspendModal.id, suspendReason.trim())
    if (result.success) {
      setSuspendModal(null)
      setSuspendReason('')
      load()
    }
    setActionLoading(false)
  }

  const handleReactivate = async (id: string) => {
    setActionLoading(true)
    const result = await adminReactivateRestaurant(id)
    if (result.success) load()
    setActionLoading(false)
  }

  const handleSavePaidUntil = async () => {
    if (!editPaidUntil) return
    setActionLoading(true)
    const result = await adminSetSubscriptionPaidUntil(
      editPaidUntil.id,
      editPaidUntil.value || null
    )
    if (result.success) {
      setEditPaidUntil(null)
      load()
    }
    setActionLoading(false)
  }

  const handleSaveSlug = async () => {
    if (!editSlug) return
    setActionLoading(true)
    setSlugError('')
    const result = await adminUpdateSlug(editSlug.id, editSlug.value)
    if (result.success) {
      setEditSlug(null)
      load()
    } else {
      setSlugError(result.error ?? 'Fehler')
    }
    setActionLoading(false)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Restaurants</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{restaurants.length} Restaurants</p>
      </div>

      {/* Filter + Suche */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {([
            { key: 'all' as const, label: 'Alle' },
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
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              border: '1px solid #e5e7eb', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button type="submit" style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #3b82f6',
            background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>Suchen</button>
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
                  <th style={{ ...thStyle, textAlign: 'center' }}>Bezahlt bis</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Kunden</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Bestellungen</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Umsatz</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map(r => {
                  const isOverdue = !r.subscriptionPaidUntil || r.subscriptionPaidUntil < today
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{r.name}</span>
                        <br />
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{r.id.slice(0, 8)}</span>
                      </td>
                      <td style={tdStyle}>
                        {editSlug?.id === r.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editSlug.value}
                              onChange={e => setEditSlug({ ...editSlug, value: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveSlug() }}
                              style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '11px', color: '#111827', width: '120px', fontFamily: 'monospace' }}
                              autoFocus
                            />
                            <button onClick={handleSaveSlug} disabled={actionLoading} style={{
                              padding: '3px 8px', borderRadius: '4px', border: 'none',
                              background: '#3b82f6', color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                            }}>✓</button>
                            <button onClick={() => { setEditSlug(null); setSlugError('') }} style={{
                              padding: '3px 8px', borderRadius: '4px', border: '1px solid #e5e7eb',
                              background: '#fff', color: '#6b7280', fontSize: '10px', cursor: 'pointer',
                            }}>✕</button>
                            {slugError && <span style={{ fontSize: '10px', color: '#ef4444' }}>{slugError}</span>}
                          </div>
                        ) : (
                          <span
                            onClick={() => { setEditSlug({ id: r.id, value: r.slug ?? '' }); setSlugError('') }}
                            style={{
                              cursor: 'pointer', padding: '2px 8px', borderRadius: '6px',
                              fontSize: '11px', fontFamily: 'monospace', fontWeight: 500,
                              background: r.slug ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)',
                              color: r.slug ? '#3b82f6' : '#9ca3af',
                              border: `1px dashed ${r.slug ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            }}
                            title="Klick zum Bearbeiten"
                          >
                            {r.slug ?? '— setzen'}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}><span style={{ color: '#6b7280', fontSize: '12px' }}>{r.ownerEmail ?? '—'}</span></td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {editPaidUntil?.id === r.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                              type="date"
                              value={editPaidUntil.value}
                              onChange={e => setEditPaidUntil({ ...editPaidUntil, value: e.target.value })}
                              style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '11px', color: '#111827' }}
                            />
                            <button onClick={handleSavePaidUntil} disabled={actionLoading} style={{
                              padding: '3px 8px', borderRadius: '4px', border: 'none',
                              background: '#3b82f6', color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                            }}>✓</button>
                            <button onClick={() => setEditPaidUntil(null)} style={{
                              padding: '3px 8px', borderRadius: '4px', border: '1px solid #e5e7eb',
                              background: '#fff', color: '#6b7280', fontSize: '10px', cursor: 'pointer',
                            }}>✕</button>
                          </div>
                        ) : (
                          <span
                            onClick={() => setEditPaidUntil({ id: r.id, value: r.subscriptionPaidUntil ?? '' })}
                            style={{
                              cursor: 'pointer', padding: '2px 8px', borderRadius: '6px',
                              fontSize: '11px', fontWeight: 600,
                              background: isOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                              color: isOverdue ? '#ef4444' : '#22c55e',
                              border: `1px dashed ${isOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                            }}
                            title="Klick zum Bearbeiten"
                          >
                            {r.subscriptionPaidUntil
                              ? new Date(r.subscriptionPaidUntil).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '⚠️ offen'
                            }
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#111827' }}>{r.totalCustomers}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#111827' }}>{r.totalOrders}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{eur(r.totalRevenue)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {r.isSuspended ? (
                          <span title={r.suspensionReason ?? ''} style={{
                            display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'help',
                          }}>🚫 Gesperrt</span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 600, background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                          }}>✓ Aktiv</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {r.isSuspended ? (
                          <button onClick={() => handleReactivate(r.id)} disabled={actionLoading} style={btnGreenStyle}>
                            Freigeben
                          </button>
                        ) : (
                          <button onClick={() => { setSuspendModal(r); setSuspendReason('') }} style={btnRedStyle}>
                            Sperren
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sperr-Modal */}
      {suspendModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setSuspendModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Restaurant sperren
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
              <strong>{suspendModal.name}</strong> wird für Bestellungen gesperrt.
            </p>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Grund der Sperrung *
            </label>
            <textarea
              value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              placeholder="z.B. Offene Rechnung, Vertragsverletzung…"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db',
                fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box',
                outline: 'none', color: '#111827',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSuspendModal(null)} style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: '#fff', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>Abbrechen</button>
              <button onClick={handleSuspend} disabled={!suspendReason.trim() || actionLoading} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                opacity: !suspendReason.trim() ? 0.5 : 1,
              }}>Sperren</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: '11px',
  fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px',
}
const tdStyle: React.CSSProperties = { padding: '10px 14px', color: '#374151' }
const btnRedStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
  background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
}
const btnGreenStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)',
  background: 'rgba(34,197,94,0.06)', color: '#22c55e', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
}
