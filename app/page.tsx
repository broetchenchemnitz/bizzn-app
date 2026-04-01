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
    // Simulate async submit — replace with real API call
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] px-4 py-16 overflow-hidden">

      {/* Ambient glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-10 blur-[120px]"
          style={{ background: 'var(--brand-accent)' }}
        />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-5 blur-[100px]"
          style={{ background: 'var(--brand-hover)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-2xl w-full">

        {/* Logo */}
        <Link href="/" aria-label="Bizzn Startseite">
          <Image
            src="/logo.svg"
            alt="Bizzn Logo"
            width={400}
            height={400}
            className="w-40 md:w-52 h-auto drop-shadow-2xl"
            priority
          />
        </Link>

        {/* Beta Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide uppercase"
          style={{
            borderColor: 'rgba(var(--brand-accent-rgb), 0.3)',
            color: 'var(--brand-accent)',
            background: 'rgba(var(--brand-accent-rgb), 0.08)',
          }}
        >
          🚀 Private Beta startet bald
        </div>

        {/* H1 */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Das Gastro-OS{' '}
          <span style={{ color: 'var(--brand-accent)' }}>
            der nächsten Generation.
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-lg text-white/50 max-w-xl leading-relaxed">
          Wir bauen die fairste, smarteste und schnellste Plattform für Restaurants.
          Kein Lieferando-Monopol mehr.{' '}
          <span className="text-white/75 font-medium">Deine Daten, deine Kunden, dein Umsatz.</span>
        </p>

        {/* Email Form */}
        <div className="w-full max-w-md">
          {submitted ? (
            <div
              className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border text-sm font-medium"
              style={{
                borderColor: 'rgba(var(--brand-accent-rgb), 0.3)',
                background: 'rgba(var(--brand-accent-rgb), 0.08)',
                color: 'var(--brand-accent)',
              }}
            >
              <span className="text-xl">✓</span>
              Du bist auf der Liste! Wir melden uns bald.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                id="early-access-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                required
                disabled={loading}
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm outline-none transition-all disabled:opacity-50"
                style={{
                  // @ts-expect-error - CSS custom property
                  '--tw-ring-color': 'var(--brand-accent)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button
                id="early-access-submit"
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary btn-glow-primary px-6 py-3.5 rounded-xl text-sm font-bold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Wird gespeichert…
                  </span>
                ) : (
                  'Vorabzugang sichern'
                )}
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-white/25">
            Kein Spam. Keine Weitergabe. Nur ein Bescheid, wenn wir live gehen.
          </p>
        </div>

        {/* Social proof / trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-xs text-white/30 font-medium">
          <span>🔒 DSGVO-konform</span>
          <span>⚡ Kein Lieferando-Lock-in</span>
          <span>🍽️ Für Gastronomen gebaut</span>
        </div>

        {/* Login link for existing users */}
        <Link
          href="/auth/login"
          className="text-sm text-white/30 hover:text-white/60 transition-colors underline underline-offset-4"
        >
          Bereits registriert? Einloggen →
        </Link>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/20">
        © 2026 Bizzn.de – Made for Restaurants.
      </footer>
    </main>
  )
}
