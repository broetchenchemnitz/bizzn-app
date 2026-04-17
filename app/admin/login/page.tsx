'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (data.success) {
        router.push('/admin')
      } else {
        setError(data.error || 'Login fehlgeschlagen.')
      }
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <form onSubmit={handleLogin} style={{
        width: '100%', maxWidth: '380px', padding: '40px',
        background: '#fff', borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: '20px', color: '#fff', fontWeight: 900,
          }}>B</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            Bizzn Admin
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Plattform-Verwaltung
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid #d1d5db', fontSize: '14px', color: '#111827',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid #d1d5db', fontSize: '14px', color: '#111827',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '12px', margin: 0, fontWeight: 600 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', borderRadius: '8px',
              border: 'none', background: '#3b82f6', color: '#fff',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
              marginTop: '4px',
            }}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </div>
      </form>
    </div>
  )
}
