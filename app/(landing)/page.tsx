'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitting(true)

    // TODO: Hier den echten API-Call einbauen:
    // z.B. INSERT in Supabase-Tabelle "waitlist" ODER
    // POST an Resend-API für Bestätigungs-E-Mail an kontakt@bizzn.de
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSuccess(true)
    setIsSubmitting(false)
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
            width={256}
            height={256}
            className="w-[280px] md:w-[400px] lg:w-[500px] h-auto mx-auto -mb-8 md:-mb-16 lg:-mb-24"
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
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-gray-200">
          Dein eigenes Lieferportal.{' '}
          <span style={{ color: 'var(--brand-accent)' }}>
            Ohne horrende Provisionen.
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mt-4" style={{ lineHeight: '1.7' }}>
          Wir bauen die fairste, smarteste und schnellste Plattform für Restaurants.
          Kein Lieferando-Monopol mehr.{' '}
          <span className="text-gray-100 font-semibold">
            Deine Daten, deine Kunden, dein Umsatz.
          </span>
        </p>

        {/* Email Form */}
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {isSuccess ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px 28px',
              borderRadius: '16px',
              border: '1px solid rgba(199,161,122,0.3)',
              background: 'rgba(199,161,122,0.08)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '32px', lineHeight: 1 }}>🎉</span>
              <p className="text-xl font-bold" style={{ margin: 0, lineHeight: '1.5', color: 'var(--brand-accent)' }}>
                Danke! Du stehst auf der Liste.<br />
                <span style={{ fontWeight: 400, fontSize: '15px', color: 'rgba(199,161,122,0.75)' }}>
                  Wir melden uns in Kürze.
                </span>
              </p>
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
                disabled={isSubmitting}
                className="placeholder:text-gray-500"
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#d1d5db',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
              <button
                id="early-access-submit"
                type="submit"
                disabled={isSubmitting || !email.trim()}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  background: isSubmitting || !email.trim() ? 'rgba(199,161,122,0.4)' : 'var(--brand-accent)',
                  color: '#111111',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSubmitting || !email.trim() ? 'not-allowed' : 'pointer',
                  border: 'none',
                  transition: 'background 0.2s, opacity 0.2s',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && email.trim()) e.currentTarget.style.background = 'var(--brand-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting && email.trim()) e.currentTarget.style.background = 'var(--brand-accent)'
                }}
              >
                {isSubmitting ? 'Wird eingetragen…' : 'Vorabzugang sichern'}
              </button>
            </form>
          )}

          <p className="text-gray-500" style={{ marginTop: '12px', fontSize: '12px', textAlign: 'center' }}>
            Kein Spam. Keine Weitergabe. Nur ein Bescheid, wenn wir live gehen.
          </p>
        </div>

        {/* Trust signals */}
        <div className="text-gray-400" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
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
          className="text-gray-400 hover:text-gray-200 transition-colors"
          style={{ fontSize: '13px', textDecoration: 'underline' }}
        >
          Bereits registriert? Einloggen →
        </Link>
      </div>

      {/* Footer */}
      <p className="text-gray-500" style={{
        position: 'absolute',
        bottom: '24px',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '12px',
      }}>
        © 2026 Bizzn.de – Made for Restaurants.
      </p>
    </div>
  )
}
