'use client'

import { useEffect, useState } from 'react'
import { getAdminDashboardStats, type AdminStats } from '@/app/actions/admin-actions'

const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: '24px', height: '24px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    )
  }

  if (!stats) return <p style={{ color: '#6b7280' }}>Fehler beim Laden der Daten.</p>

  const kpis: { label: string; value: string; sub?: string; color: string }[] = [
    { label: 'Gesamtumsatz', value: eur(stats.totalRevenue), color: '#10b981' },
    { label: 'Bestellungen gesamt', value: String(stats.totalOrders), sub: `Heute: ${stats.ordersToday} · Woche: ${stats.ordersThisWeek}`, color: '#3b82f6' },
    { label: 'Kunden', value: String(stats.totalCustomers), color: '#8b5cf6' },
    { label: 'Restaurants', value: `${stats.activeRestaurants}`, sub: stats.suspendedRestaurants > 0 ? `${stats.suspendedRestaurants} gesperrt` : 'alle aktiv', color: '#f59e0b' },
    { label: 'Pass-Inhaber', value: String(stats.passHolders), sub: stats.passCancelled > 0 ? `${stats.passCancelled} gekündigt` : '', color: '#C7A17A' },
    { label: 'Pass-Einnahmen / Monat', value: eur(stats.passRevenue), color: '#ec4899' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Dashboard</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Plattform-Übersicht — Stand: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '32px',
      }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            border: '1px solid #e5e7eb',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>{k.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: k.color, margin: '0 0 2px' }}>{k.value}</p>
            {k.sub && <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {[
          { href: '/admin/customers', title: 'Kunden verwalten', desc: 'Alle Kunden sehen, sperren, Pass-Status prüfen', icon: '👥' },
          { href: '/admin/restaurants', title: 'Restaurants verwalten', desc: 'Restaurants sperren, Umsätze und Abo-Status einsehen', icon: '🍴' },
          { href: '/admin/passes', title: 'Bizzn-Pass Übersicht', desc: 'Abonnenten, Kündigungen und Einnahmen', icon: '👑' },
        ].map(link => (
          <a key={link.href} href={link.href} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: '#fff', borderRadius: '12px', padding: '20px',
            border: '1px solid #e5e7eb', textDecoration: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }} onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)' }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <span style={{ fontSize: '28px' }}>{link.icon}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#111827', margin: '0 0 2px' }}>{link.title}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{link.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
