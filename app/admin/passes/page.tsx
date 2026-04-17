'use client'

import { useEffect, useState } from 'react'
import { getAdminPasses, type AdminPassHolder } from '@/app/actions/admin-actions'

const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`

export default function AdminPassesPage() {
  const [passes, setPasses] = useState<AdminPassHolder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminPasses()
      .then(setPasses)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const active = passes.filter(p => p.status === 'active' || p.status === 'trialing')
  const cancelled = active.filter(p => p.cancelAtPeriodEnd)
  const fullyActive = active.filter(p => !p.cancelAtPeriodEnd)
  const inactive = passes.filter(p => p.status !== 'active' && p.status !== 'trialing')

  const monthlyRevenue = fullyActive.length * 499 // 4,99 € in Cent

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Bizzn-Pass Übersicht</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Alle Pass-Abonnements auf einen Blick</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Aktive Abos', value: String(fullyActive.length), color: '#10b981' },
          { label: 'Gekündigt (aktiv bis)', value: String(cancelled.length), color: '#f59e0b' },
          { label: 'Inaktiv', value: String(inactive.length), color: '#9ca3af' },
          { label: 'Monatliche Einnahmen', value: eur(monthlyRevenue), color: '#C7A17A' },
          { label: 'Churn-Rate', value: active.length > 0 ? `${Math.round((cancelled.length / active.length) * 100)}%` : '0%', color: '#ef4444' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#fff', borderRadius: '12px', padding: '16px',
            border: '1px solid #e5e7eb',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>{k.label}</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabelle */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          </div>
        ) : passes.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '14px' }}>Keine Pass-Abonnements gefunden.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={thStyle}>Kunde</th>
                  <th style={thStyle}>E-Mail</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Enddatum</th>
                  <th style={thStyle}>Seit</th>
                  <th style={thStyle}>Stripe-ID</th>
                </tr>
              </thead>
              <tbody>
                {passes.map(p => (
                  <tr key={p.userId} style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{p.name}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>{p.email ?? '—'}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {p.cancelAtPeriodEnd ? (
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 700,
                          background: 'rgba(251,191,36,0.08)', color: '#f59e0b',
                        }}>⏳ Gekündigt</span>
                      ) : p.status === 'active' || p.status === 'trialing' ? (
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 600,
                          background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                        }}>✓ Aktiv</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 600,
                          background: 'rgba(156,163,175,0.08)', color: '#9ca3af',
                        }}>{p.status}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {p.currentPeriodEnd ? (
                        <span style={{ color: p.cancelAtPeriodEnd ? '#f59e0b' : '#6b7280', fontSize: '12px', fontWeight: p.cancelAtPeriodEnd ? 600 : 400 }}>
                          {new Date(p.currentPeriodEnd).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>
                        {new Date(p.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#9ca3af', fontSize: '10px', fontFamily: 'monospace' }}>{p.stripeSubscriptionId.slice(0, 18)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: '11px',
  fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px',
}
const tdStyle: React.CSSProperties = { padding: '10px 14px', color: '#374151' }
