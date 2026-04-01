'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div
      style={{ background: '#0a0a0a', minHeight: '100vh' }}
      className="relative flex flex-col items-center justify-center px-4 py-16 overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-160px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          borderRadius: '50%',
          background: 'var(--brand-accent)',
          opacity: 0.08,
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-8 w-full max-w-xl">

        {/* Logo */}
        <Link href="/" aria-label="Bizzn Startseite">
          <Image
            src="/logo.svg"
            alt="Bizzn Logo"
            width={180}
            height={180}
            className="w-36 md:w-44 h-auto"
            priority
          />
        </Link>

        {/* Beta Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          border: '1px solid rgba(199,161,122,0.35)',
          color: 'var(--brand-accent)',
          background: 'rgba(199,161,122,0.08)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          🚀 Private Beta startet bald
        </div>

        {/* H1 */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Das Gastro-OS{' '}
          <span style={{ color: 'var(--brand-accent)' }}>
            der nächsten Generation.
          </span>
        </h1>

        {/* Subtext */}
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '18px', lineHeight: '1.7', maxWidth: '480px' }}>
          Wir bauen die fairste, smarteste und schnellste Plattform für Restaurants.
          Kein Lieferando-Monopol mehr.{' '}
          <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
            Deine Daten, deine Kunden, dein Umsatz.
          </span>
        </p>

        {/* Email Form */}
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {submitted ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 24px',
              borderRadius: '16px',
              border: '1px solid rgba(199,161,122,0.3)',
              background: 'rgba(199,161,122,0.08)',
              color: 'var(--brand-accent)',
              fontSize: '14px',
              fontWeight: 500,
            }}>
              ✓ Du bist auf der Liste! Wir melden uns bald.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                id="early-access-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
              <button
                id="early-access-submit"
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  background: loading || !email.trim() ? 'rgba(199,161,122,0.4)' : 'var(--brand-accent)',
                  color: '#000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  border: 'none',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!loading && email.trim()) e.currentTarget.style.background = 'var(--brand-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!loading && email.trim()) e.currentTarget.style.background = 'var(--brand-accent)'
                }}
              >
                {loading ? 'Wird gespeichert…' : 'Vorabzugang sichern'}
              </button>
            </form>
          )}

          <p style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            Kein Spam. Keine Weitergabe. Nur ein Bescheid, wenn wir live gehen.
          </p>
        </div>

        {/* Trust signals */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          <span>🔒 DSGVO-konform</span>
          <span>⚡ Kein Lock-in</span>
          <span>🍽️ Für Gastronomen gebaut</span>
        </div>

        {/* Login link */}
        <Link
          href="/auth/login"
          style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}
        >
          Bereits registriert? Einloggen →
        </Link>
      </div>

      {/* Footer */}
      <p style={{
        position: 'absolute',
        bottom: '24px',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.18)',
      }}>
        © 2026 Bizzn.de – Made for Restaurants.
      </p>
    </div>
  )
}
