'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApproveProject, adminRejectProject } from '@/app/actions/admin-actions'

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
  { label: '0 €', sub: 'Gratis', value: 0 },
  { label: '29 €', sub: '/Monat', value: 2900 },
  { label: '49 €', sub: '/Monat', value: 4900 },
  { label: '99 €', sub: '/Monat', value: 9900 },
  { label: '149 €', sub: '/Monat', value: 14900 },
]

const DAYS = [
  { key: 'mo', label: 'Montag' }, { key: 'di', label: 'Dienstag' }, { key: 'mi', label: 'Mittwoch' },
  { key: 'do', label: 'Donnerstag' }, { key: 'fr', label: 'Freitag' },
  { key: 'sa', label: 'Samstag' }, { key: 'so', label: 'Sonntag' },
]

// Per-card state (price, note, custom)
interface CardState {
  price: number
  customPrice: string
  isCustom: boolean
  note: string
  showReject: boolean
  rejectReason: string
  saving: boolean
}

const defaultCardState = (): CardState => ({
  price: 9900, customPrice: '', isCustom: false, note: '', showReject: false, rejectReason: '', saving: false
})

export default function AdminReviewPage() {
  const [projects, setProjects] = useState<ReviewProject[]>([])
  const [loading, setLoading] = useState(true)
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pending-review')
      if (!res.ok) throw new Error('Failed')
      const data: ReviewProject[] = await res.json()
      setProjects(data)
      // Init card state for new projects
      setCardStates(prev => {
        const next = { ...prev }
        data.forEach(p => { if (!next[p.id]) next[p.id] = defaultCardState() })
        return next
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setCard = (id: string, patch: Partial<CardState>) =>
    setCardStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const handleApprove = async (p: ReviewProject) => {
    const cs = cardStates[p.id]
    if (!cs) return
    const price = cs.isCustom
      ? Math.round(parseFloat(cs.customPrice.replace(',', '.')) * 100)
      : cs.price
    setCard(p.id, { saving: true })
    const result = await adminApproveProject(p.id, isNaN(price) ? 9900 : price, cs.note || undefined)
    if (result.success) {
      setProjects(prev => prev.filter(x => x.id !== p.id))
    }
    setCard(p.id, { saving: false })
  }

  const handleReject = async (p: ReviewProject) => {
    const cs = cardStates[p.id]
    if (!cs?.rejectReason.trim()) return
    setCard(p.id, { saving: true })
    const result = await adminRejectProject(p.id, cs.rejectReason.trim())
    if (result.success) {
      setProjects(prev => prev.filter(x => x.id !== p.id))
    }
    setCard(p.id, { saving: false })
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
      <div style={{ width: '30px', height: '30px', border: '3px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
          🔍 Restaurant-Freigaben
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          {projects.length === 0
            ? 'Keine Anträge ausstehend — alles erledigt ✓'
            : `${projects.length} ${projects.length === 1 ? 'Antrag wartet' : 'Anträge warten'} auf Prüfung`}
        </p>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
          <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: 500 }}>Keine ausstehenden Anträge</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {projects.map(p => {
            const cs = cardStates[p.id] ?? defaultCardState()
            const effectivePrice = cs.isCustom
              ? Math.round(parseFloat(cs.customPrice.replace(',', '.')) * 100)
              : cs.price

            return (
              <div key={p.id} style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

                {/* Cover */}
                {p.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_image_url} alt="Cover" style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100px', background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '36px', opacity: 0.25 }}>🍽️</span>
                  </div>
                )}

                <div style={{ padding: '28px' }}>

                  {/* ── Kopfzeile ── */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>{p.name}</h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        {p.cuisine_type && (
                          <span style={{ padding: '3px 12px', borderRadius: '20px', background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(99,102,241,0.2)' }}>
                            {p.cuisine_type}
                          </span>
                        )}
                        {p.slug ? (
                          <a href={`http://localhost:3000/${p.slug}`} target="_blank" rel="noreferrer"
                            style={{ fontSize: '12px', color: '#3b82f6', fontFamily: 'monospace', fontWeight: 600 }}>
                            /{p.slug} ↗
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>⚠️ Kein Slug</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, background: '#f9fafb', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Eingereicht am</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                        {new Date(p.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* ── Info-Grid ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>

                    <InfoSection title="👤 Inhaber">
                      <InfoRow label="E-Mail" value={p.ownerEmail ?? '—'} />
                      {p.ownerName && <InfoRow label="Name" value={p.ownerName} />}
                    </InfoSection>

                    <InfoSection title="📍 Kontakt & Standort">
                      {p.address && <InfoRow label="Adresse" value={p.address} />}
                      {(p.postal_code || p.city) && <InfoRow label="PLZ / Stadt" value={[p.postal_code, p.city].filter(Boolean).join(' ')} />}
                      {p.phone && <InfoRow label="Telefon" value={p.phone} link={`tel:${p.phone}`} />}
                    </InfoSection>

                    <InfoSection title="📖 Speisekarte">
                      <InfoRow label="Gerichte" value={`${p.menuItemCount} Einträge`} highlight={p.menuItemCount > 0} />
                      {p.slug && (
                        <a href={`http://localhost:3000/${p.slug}/menu`} target="_blank" rel="noreferrer"
                          style={{ marginTop: '6px', fontSize: '12px', color: '#3b82f6', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Speisekarte prüfen ↗
                        </a>
                      )}
                    </InfoSection>

                  </div>

                  {/* ── Beschreibung ── */}
                  {p.description && (
                    <div style={{ marginBottom: '16px', padding: '16px', background: '#fafafa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <div style={sectionLabel}>📝 Beschreibung</div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.65 }}>{p.description}</p>
                    </div>
                  )}

                  {/* ── Öffnungszeiten ── */}
                  {p.opening_hours && Object.keys(p.opening_hours).length > 0 && (
                    <div style={{ marginBottom: '16px', padding: '16px', background: '#fafafa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <div style={sectionLabel}>🕐 Öffnungszeiten</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {DAYS.map(d => {
                          const val = p.opening_hours?.[d.key] ?? ''
                          const closed = !val || val.toLowerCase() === 'geschlossen'
                          return (
                            <div key={d.key} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280', width: '90px', flexShrink: 0 }}>{d.label}</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: closed ? '#9ca3af' : '#111827' }}>
                                {closed ? '— Geschlossen' : val}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Vorige Notiz ── */}
                  {p.superadmin_note && (
                    <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(245,158,11,0.05)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', fontSize: '13px', color: '#92400e' }}>
                      <strong>Vorige Notiz:</strong> {p.superadmin_note}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────── */}
                  {/* ── ENTSCHEIDUNGSBEREICH ─────────────────────────────── */}
                  {/* ────────────────────────────────────────────────────── */}
                  <div style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '2px solid #e2e8f0' }}>

                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                      Entscheidung treffen
                    </div>

                    {/* Preis-Sektion */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                        💶 Monatlicher Preis festlegen
                      </div>

                      {/* Preset-Buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {PRICE_PRESETS.map(preset => {
                          const active = !cs.isCustom && cs.price === preset.value
                          return (
                            <button key={preset.value}
                              onClick={() => setCard(p.id, { price: preset.value, isCustom: false })}
                              style={{
                                padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                                border: `2px solid ${active ? '#22c55e' : '#e2e8f0'}`,
                                background: active ? 'rgba(34,197,94,0.07)' : '#fff',
                                color: active ? '#15803d' : '#374151',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                                boxShadow: active ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                              }}>
                              <span style={{ fontSize: '16px', fontWeight: 800 }}>{preset.label}</span>
                              <span style={{ fontSize: '10px', color: active ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>{preset.sub}</span>
                            </button>
                          )
                        })}

                        {/* Individuell */}
                        <button
                          onClick={() => setCard(p.id, { isCustom: true })}
                          style={{
                            padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                            border: `2px solid ${cs.isCustom ? '#3b82f6' : '#e2e8f0'}`,
                            background: cs.isCustom ? 'rgba(59,130,246,0.06)' : '#fff',
                            color: cs.isCustom ? '#2563eb' : '#9ca3af',
                            boxShadow: cs.isCustom ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                          }}>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>Individuell</span>
                        </button>
                      </div>

                      {/* Custom-Eingabe */}
                      {cs.isCustom && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                          <input
                            type="text"
                            value={cs.customPrice}
                            onChange={e => setCard(p.id, { customPrice: e.target.value })}
                            placeholder="z.B. 75"
                            autoFocus
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '16px', fontWeight: 700, width: '100px', textAlign: 'center', outline: 'none', color: '#111827' }}
                          />
                          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600 }}>€ pro Monat</span>
                        </div>
                      )}

                      {/* Preis-Hinweis */}
                      <div style={{ marginTop: '10px', fontSize: '12px', color: effectivePrice === 0 ? '#16a34a' : '#6b7280', background: effectivePrice === 0 ? 'rgba(34,197,94,0.06)' : 'transparent', padding: effectivePrice === 0 ? '6px 10px' : '0', borderRadius: '6px', fontWeight: effectivePrice === 0 ? 600 : 400 }}>
                        {effectivePrice === 0
                          ? '✓ Gratis — Gastronom kann sofort online gehen, keine Zahlung nötig'
                          : `ℹ️ Gastronom bezahlt ${(effectivePrice / 100).toLocaleString('de-DE')} € monatlich nach Freigabe`
                        }
                      </div>
                    </div>

                    {/* Notiz-Feld */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        💬 Persönliche Nachricht (optional)
                      </div>
                      <textarea
                        value={cs.note}
                        onChange={e => setCard(p.id, { note: e.target.value })}
                        placeholder="z.B. Herzlich willkommen bei bizzn! Wir freuen uns auf die Zusammenarbeit. Falls du Fragen hast, stehen wir gerne zur Verfügung."
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', color: '#374151', background: '#fff', lineHeight: 1.6 }}
                      />
                    </div>

                    {/* Ablehnen-Bereich (aufklappbar) */}
                    {cs.showReject && (
                      <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(239,68,68,0.04)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          ✕ Ablehnungsgrund *
                        </div>
                        <textarea
                          value={cs.rejectReason}
                          onChange={e => setCard(p.id, { rejectReason: e.target.value })}
                          placeholder="z.B. Die Speisekarte ist unvollständig — bitte füge mindestens 5 Gerichte hinzu und reiche den Antrag erneut ein."
                          autoFocus
                          style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', color: '#374151', background: '#fff', lineHeight: 1.6 }}
                        />
                      </div>
                    )}

                    {/* Action-Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {!cs.showReject ? (
                        <button
                          onClick={() => setCard(p.id, { showReject: true })}
                          style={{ padding: '11px 22px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)', color: '#dc2626', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                          ✕ Ablehnen
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setCard(p.id, { showReject: false, rejectReason: '' })}
                            style={{ padding: '11px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            Zurück
                          </button>
                          <button
                            onClick={() => handleReject(p)}
                            disabled={!cs.rejectReason.trim() || cs.saving}
                            style={{ padding: '11px 22px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', opacity: !cs.rejectReason.trim() || cs.saving ? 0.5 : 1 }}>
                            {cs.saving ? '…' : 'Ablehnen bestätigen'}
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleApprove(p)}
                        disabled={cs.saving || (cs.isCustom && !cs.customPrice.trim())}
                        style={{
                          padding: '12px 32px', borderRadius: '10px', border: 'none',
                          background: cs.saving ? '#9ca3af' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                          color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer',
                          boxShadow: '0 3px 12px rgba(34,197,94,0.35)',
                          opacity: cs.saving || (cs.isCustom && !cs.customPrice.trim()) ? 0.7 : 1,
                          transition: 'all 0.15s',
                        }}>
                        {cs.saving ? 'Wird gespeichert…' : '✓ Jetzt freigeben'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Hilfs-Komponenten ─────────────────────────────────────────────────────────

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', background: '#fafafa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
      <div style={sectionLabel}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value, highlight, link }: { label: string; value: string; highlight?: boolean; link?: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '80px', flexShrink: 0, paddingTop: '2px' }}>{label}</span>
      {link ? (
        <a href={link} style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6', wordBreak: 'break-word', textDecoration: 'none' }}>{value}</a>
      ) : (
        <span style={{ fontSize: '13px', fontWeight: 600, color: highlight ? '#16a34a' : '#111827', wordBreak: 'break-word' }}>{value}</span>
      )}
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px'
}
