'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/review', label: 'Freigaben', icon: '🔍' },
  { href: '/admin/customers', label: 'Kunden', icon: '👥' },
  { href: '/admin/restaurants', label: 'Restaurants', icon: '🍴' },
  { href: '/admin/passes', label: 'Bizzn-Pass', icon: '👑' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    if (pathname === '/admin/login') {
      setAuthenticated(false)
      return
    }
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) router.replace('/admin/login')
        else setAuthenticated(true)
      })
      .catch(() => router.replace('/admin/login'))
  }, [pathname, router])

  // Login-Seite: kein Layout
  if (pathname === '/admin/login') return <>{children}</>
  // Loading
  if (authenticated === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ width: '24px', height: '24px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    )
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', gap: '24px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginRight: '24px',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', color: '#fff', fontWeight: 900,
          }}>B</div>
          <span style={{ fontWeight: 800, fontSize: '15px', color: '#111827' }}>Bizzn Admin</span>
        </div>

        <nav style={{ display: 'flex', gap: '2px', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                color: active ? '#3b82f6' : '#6b7280',
                background: active ? 'rgba(59,130,246,0.08)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <button onClick={handleLogout} style={{
          padding: '6px 12px', borderRadius: '6px',
          border: '1px solid #e5e7eb', background: '#fff',
          color: '#6b7280', fontSize: '12px', fontWeight: 600,
          cursor: 'pointer',
        }}>
          Abmelden
        </button>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {children}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
