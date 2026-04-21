'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApproveProject, adminRejectProject } from '@/app/actions/admin-actions'
import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewProject {
  id: string
  name: string
  slug: string | null
  description: string | null
  address: string | null
  phone: string | null
  cuisine_type: string | null
  cover_image_url: string | null
  opening_hours: Record<string, string> | null
  city: string | null
  postal_code: string | null
  created_at: string
  ownerEmail: string | null
  ownerName: string | null
  menuItemCount: number
  superadmin_note: string | null
}

const PRICE_PRESETS = [
  { label: '0 € (Gratis)', value: 0 },
  { label: '49 €', value: 4900 },
  { label: '99 €', value: 9900 },
  { label: '149 €', value: 14900 },
]

const DAYS: { key: string; label: string }[] = [
  { key: 'mo', label: 'Mo' }, { key: 'di', label: 'Di' }, { key: 'mi', label: 'Mi' },
  { key: 'do', label: 'Do' }, { key: 'fr', label: 'Fr' },
  { key: 'sa', label: 'Sa' }, { key: 'so', label: 'So' },
]

export default function AdminReviewPage() {
  const [projects, setProjects] = useState<ReviewProject[]>([])
  const [loading, setLoading] = useState(true)
  const [approveModal, setApproveModal] = useState<ReviewProject | null>(null)
  const [rejectModal, setRejectModal] = useState<ReviewProject | null>(null)
  const [approvePrice, setApprovePrice] = useState(9900)
  const [priceMode, setPriceMode] = useState<'preset' | 'custom'>('preset')
  const [customPrice, setCustomPrice] = useState('')
  const [approveNote, setApproveNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch via API route to use admin client
      const res = await fetch('/api/admin/pending-review')
      if (!res.ok) throw new Error('Failed')
      const data: ReviewProject[] = await res.json()
      setProjects(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async () => {
    if (!approveModal) return
    setActionLoading(true)
    const price = priceMode === 'custom'
      ? Math.round(parseFloat(customPrice.replace(',', '.')) * 100)
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
      <div style={{ width: '28px', height: '28px', border: '3px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
          🔍 Restaurant-Freigaben
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          {projects.length === 0
            ? 'Keine Anträge ausstehend — alles erledigt ✓'
            : `${projects.length} ${projects.length === 1 ? 'Antrag' : 'Anträge'} warten auf deine Prüfung`
          }
        </p>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Keine ausstehenden Anträge</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {projects.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>

              {/* Cover */}
              {p.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image_url} alt="Cover" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '120px', background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '40px', opacity: 0.3 }}>🍽️</span>
                </div>
              )}

              {/* Content */}
              <div style={{ padding: '24px' }}>
                {/* Name + Meta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
                      {p.name}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {p.cuisine_type && (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(99,102,241,0.15)' }}>
                          {p.cuisine_type}
                        </span>
                      )}
                      {p.slug ? (
                        <a href={`http://localhost:3000/${p.slug}?preview=admin`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#3b82f6', fontFamily: 'monospace' }}>
                          /{p.slug} ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Kein Slug gesetzt</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Eingereicht</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      {new Date(p.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Info-Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>

                  {/* Inhaber */}
                  <InfoSection title="👤 Inhaber">
                    <InfoRow label="E-Mail" value={p.ownerEmail ?? '—'} />
                    {p.ownerName && <InfoRow label="Name" value={p.ownerName} />}
                  </InfoSection>

                  {/* Kontakt */}
                  <InfoSection title="📍 Kontakt & Standort">
                    {p.address && <InfoRow label="Adresse" value={p.address} />}
                    {(p.postal_code || p.city) && <InfoRow label="Stadt" value={[p.postal_code, p.city].filter(Boolean).join(' ')} />}
                    {p.phone && <InfoRow label="Telefon" value={p.phone} />}
                  </InfoSection>

                  {/* Speisekarte */}
                  <InfoSection title="📖 Speisekarte">
                    <InfoRow label="Menü-Einträge" value={`${p.menuItemCount} Gerichte`} highlight={p.menuItemCount > 0} />
                    {p.slug && (
                      <a href={`http://localhost:3000/${p.slug}/menu`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                        Speisekarte öffnen ↗
                      </a>
                    )}
                  </InfoSection>

                </div>

                {/* Beschreibung */}
                {p.description && (
                  <div style={{ marginBottom: '20px', padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>📝 Beschreibung</div>
                    <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, margin: 0 }}>{p.description}</p>
                  </div>
                )}

                {/* Öffnungszeiten */}
                {p.opening_hours && Object.keys(p.opening_hours).length > 0 && (
                  <div style={{ marginBottom: '20px', padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>🕐 Öffnungszeiten</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                      {DAYS.map(d => {
                        const val = p.opening_hours?.[d.key] ?? ''
                        const closed = !val || val.toLowerCase() === 'geschlossen'
                        return (
                          <div key={d.key} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '8px', background: closed ? '#f3f4f6' : 'rgba(34,197,94,0.06)', border: `1px solid ${closed ? '#e5e7eb' : 'rgba(34,197,94,0.2)'}` }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>{d.label}</div>
                            {closed ? (
                              <div style={{ fontSize: '9px', color: '#9ca3af' }}>Gesch.</div>
                            ) : (
                              <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 600, lineHeight: 1.3 }}>
                                {val.replace(' - ', '\n–\n').split('\n').map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Superadmin-Notiz (falls vorhanden) */}
                {p.superadmin_note && (
                  <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(245,158,11,0.06)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', fontSize: '13px', color: '#92400e' }}>
                    <strong>Vorige Notiz:</strong> {p.superadmin_note}
                  </div>
                )}

                {/* Aktionen */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                  <button
                    onClick={() => { setRejectModal(p); setRejectReason('') }}
                    style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✕ Ablehnen
                  </button>
                  <button
                    onClick={() => { setApproveModal(p); setApprovePrice(9900); setCustomPrice(''); setApproveNote(''); setPriceMode('preset') }}
                    style={{ padding: '10px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
                  >
                    ✓ Freigeben
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Freigabe-Modal ─────────────────────────────────────────────────── */}
      {approveModal && (
        <div style={modalOverlay} onClick={() => setApproveModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: '480px' }}>
            <div style={{ fontSize: '28px', textAlign: 'center', marginBottom: '12px' }}>🎉</div>
            <h3 style={modalTitle}>Freigabe: {approveModal.name}</h3>
            <p style={modalSubtitle}>Lege den monatlichen Preis fest — der Gastronom erhält eine E-Mail.</p>

            <label style={labelStyle}>Monatlicher Preis *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              {PRICE_PRESETS.map(preset => (
                <button key={preset.value} onClick={() => { setApprovePrice(preset.value); setPriceMode('preset') }}
                  style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${priceMode === 'preset' && approvePrice === preset.value ? '#22c55e' : '#e5e7eb'}`, background: priceMode === 'preset' && approvePrice === preset.value ? 'rgba(34,197,94,0.08)' : '#f9fafb', color: priceMode === 'preset' && approvePrice === preset.value ? '#16a34a' : '#374151', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              <button onClick={() => setPriceMode('custom')} style={{ padding: '10px 14px', borderRadius: '8px', border: `2px solid ${priceMode === 'custom' ? '#3b82f6' : '#e5e7eb'}`, background: priceMode === 'custom' ? 'rgba(59,130,246,0.06)' : '#f9fafb', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: priceMode === 'custom' ? '#3b82f6' : '#6b7280' }}>
                Individuell
              </button>
              {priceMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="text" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="z.B. 75"
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '80px', fontSize: '14px', textAlign: 'center', fontWeight: 600 }} autoFocus />
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>€ / Monat</span>
                </div>
              )}
            </div>

            <label style={labelStyle}>Persönliche Nachricht (optional)</label>
            <textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
              placeholder="z.B. Herzlich willkommen bei bizzn! Wir freuen uns auf die Zusammenarbeit."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', color: '#111827', marginBottom: '4px' }} />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 16px' }}>
              {priceMode === 'preset' && approvePrice === 0 ? '💡 Bei 0 € kann der Gastronom sofort online gehen.' : '💡 Der Gastronom muss nach Freigabe die monatliche Gebühr bezahlen.'}
            </p>

            <div style={modalActions}>
              <button onClick={() => setApproveModal(null)} style={btnOutline}>Abbrechen</button>
              <button onClick={handleApprove} disabled={actionLoading}
                style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading ? 'Wird gespeichert…' : '✓ Jetzt freigeben'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ablehnen-Modal ─────────────────────────────────────────────────── */}
      {rejectModal && (
        <div style={modalOverlay} onClick={() => setRejectModal(null)}>
          <div onClick={e => e.stopPropagation()} style={modalBox}>
            <h3 style={modalTitle}>✕ Antrag ablehnen</h3>
            <p style={modalSubtitle}><strong>{rejectModal.name}</strong> — Der Gastronom erhält eine E-Mail mit dem Ablehnungsgrund.</p>
            <label style={labelStyle}>Ablehnungsgrund *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="z.B. Die Speisekarte ist unvollständig. Bitte füge mindestens 5 Gerichte hinzu."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', color: '#111827' }} />
            <div style={modalActions}>
              <button onClick={() => setRejectModal(null)} style={btnOutline}>Abbrechen</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}
                style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: !rejectReason.trim() || actionLoading ? 0.5 : 1 }}>
                {actionLoading ? 'Wird gespeichert…' : 'Ablehnen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hilfs-Komponenten ─────────────────────────────────────────────────────────

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '80px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: highlight ? '#16a34a' : '#111827', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 12px 40px rgba(0,0,0,0.16)', maxHeight: '90vh', overflowY: 'auto' }
const modalTitle: React.CSSProperties = { fontSize: '18px', fontWeight: 800, color: '#111827', margin: '0 0 6px' }
const modalSubtitle: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }
const modalActions: React.CSSProperties = { display: 'flex', gap: '10px', justifyContent: 'flex-end' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }
const btnOutline: React.CSSProperties = { padding: '12px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
