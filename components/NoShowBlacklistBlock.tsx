'use client'

import { useState, useTransition } from 'react'
import { ShieldAlert, UserX, UserCheck, Phone, Mail, AlertTriangle } from 'lucide-react'
import { unblacklistCustomer } from '@/app/[domain]/actions'

interface BlacklistEntry {
  userId: string
  name: string | null
  email: string | null
  phone: string | null
  blacklistedAt: string | null
  noShowCount: number
}

interface Props {
  entries: BlacklistEntry[]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default function NoShowBlacklistBlock({ entries: initialEntries }: Props) {
  const [entries, setEntries] = useState<BlacklistEntry[]>(initialEntries)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleUnblacklist = (userId: string) => {
    startTransition(async () => {
      const { error } = await unblacklistCustomer(userId)
      if (error) {
        setFeedback(`Fehler: ${error}`)
        return
      }
      setEntries(prev =>
        prev.map(e => e.userId === userId
          ? { ...e, blacklistedAt: null }
          : e
        )
      )
      setFeedback('Kunde wurde entsperrt.')
      setTimeout(() => setFeedback(null), 3000)
    })
  }

  const blacklistedEntries = entries.filter(e => e.blacklistedAt !== null)
  const noShowHistory = entries.filter(e => e.noShowCount > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, background: 'rgba(239,68,68,0.1)',
          borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <ShieldAlert size={18} color="#f87171" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
            No-Show-Schutz
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Kunden die Bestellungen nicht abholen, werden automatisch gesperrt.
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div style={{
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          <strong style={{ color: '#fbbf24' }}>1-Strike-Prinzip:</strong> Beim ersten No-Show wird
          der Kunde systemweit für Barzahlung gesperrt. Online-Zahlung per Karte bleibt möglich.
          Du kannst Kunden manuell entsperren.
        </div>
      </div>

      {feedback && (
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#34d399',
        }}>
          ✓ {feedback}
        </div>
      )}

      {/* Gesperrte Kunden */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Gesperrte Kunden ({blacklistedEntries.length})
        </h4>

        {blacklistedEntries.length === 0 ? (
          <div style={{
            background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 10, padding: '20px 16px', textAlign: 'center',
          }}>
            <UserCheck size={28} color="#34d399" style={{ marginBottom: 8, opacity: 0.6 }} />
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
              Keine gesperrten Kunden — alles grün! ✓
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blacklistedEntries.map(entry => (
              <div
                key={entry.userId}
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1.5px solid rgba(239,68,68,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <UserX size={16} color="#f87171" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                      {entry.name ?? 'Unbekannt'}
                      <span style={{
                        marginLeft: 8, fontSize: 11, fontWeight: 700,
                        background: 'rgba(239,68,68,0.2)', color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 20, padding: '2px 8px',
                      }}>
                        {entry.noShowCount}× No-Show
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {entry.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          <Mail size={11} /> {entry.email}
                        </span>
                      )}
                      {entry.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          <Phone size={11} /> {entry.phone}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        Gesperrt: {formatDate(entry.blacklistedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  id={`btn-unblacklist-${entry.userId.slice(0,8)}`}
                  onClick={() => handleUnblacklist(entry.userId)}
                  disabled={isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 8,
                    color: '#34d399',
                    fontSize: 13, fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <UserCheck size={14} />
                  Entsperren
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No-Show-Historie (alle — auch nicht mehr gesperrte) */}
      {noShowHistory.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            No-Show-Historie ({noShowHistory.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {noShowHistory.map(entry => (
              <div
                key={entry.userId}
                style={{
                  background: '#1e1e1e',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                    {entry.name ?? 'Unbekannt'}
                  </span>
                  {entry.email && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      {entry.email}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: entry.blacklistedAt ? '#f87171' : 'rgba(255,255,255,0.4)',
                    background: entry.blacklistedAt ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${entry.blacklistedAt ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 20, padding: '2px 10px',
                  }}>
                    {entry.blacklistedAt ? '🔒 Gesperrt' : '✓ Entsperrt'}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {entry.noShowCount}× No-Show
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
