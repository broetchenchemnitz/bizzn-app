'use client'

import { useEffect, useState } from 'react'
import { getAdminCustomers, type AdminCustomer } from '@/app/actions/admin-actions'

const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [filter, setFilter] = useState<'all' | 'pass' | 'banned'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getAdminCustomers(filter, search)
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load()
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Kunden</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{customers.length} Kunden geladen</p>
      </div>

      {/* Filter + Suche */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {([
            { key: 'all' as const, label: 'Alle' },
            { key: 'pass' as const, label: '👑 Pass-Inhaber' },
            { key: 'banned' as const, label: '🚫 Gesperrt' },
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
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '200px' }}>
          <input
            type="text" placeholder="Name, E-Mail, Telefon…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              border: '1px solid #e5e7eb', fontSize: '13px', color: '#111827',
              outline: 'none', boxSizing: 'border-box',
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
        ) : customers.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '14px' }}>Keine Kunden gefunden.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>E-Mail</th>
                  <th style={thStyle}>Telefon</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Pass</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Bestellungen</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Umsatz</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.userId} style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{c.name}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#6b7280' }}>{c.email ?? '—'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '12px' }}>{c.phone ?? '—'}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {c.hasPass ? (
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 700,
                          background: 'rgba(199,161,122,0.12)', color: '#C7A17A',
                        }}>👑 Aktiv{c.passStatus === 'active' && c.passEnd ? '' : ''}</span>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{c.totalOrders}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{eur(c.totalRevenue)}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {c.bans.length > 0 ? (
                        <span title={c.bans.map(b => `${b.restaurantName}: ${b.reason}`).join('\n')} style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 700,
                          background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                          cursor: 'help',
                        }}>🚫 {c.bans.length}x gesperrt</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 600,
                          background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                        }}>✓ Aktiv</span>
                      )}
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
  fontWeight: 600, color: '#6b7280', textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', color: '#374151',
}
