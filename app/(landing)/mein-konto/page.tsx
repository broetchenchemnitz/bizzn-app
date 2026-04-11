'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  User, Mail, Phone, ShoppingBag, Star, LogOut, Save,
  ChevronRight, Clock, CheckCircle, Loader2, ArrowLeft,
  Package, Zap, Lock, Eye, EyeOff, Crown, Sparkles, Car,
} from 'lucide-react'
import { getCustomerSession, signInCustomer, signUpCustomer } from '@/app/actions/customer'
import { createClient } from '@/utils/supabase/client'
import {
  getCustomerProfile,
  updateCustomerProfile,
  getMyOrders,
  type CustomerProfile,
  type OrderHistoryItem,
} from '@/app/actions/customer-account'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoyaltyBalance {
  id: string
  user_id: string
  project_id: string
  balance_cents: number
  order_count: number
  last_order_at: string | null
  expires_at: string | null
  project_name: string
  project_slug: string
  project_cover: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; step: number }> = {
  pending:   { label: 'Neu eingegangen', emoji: '🕐', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', step: 0 },
  preparing: { label: 'In Vorbereitung', emoji: '👨‍🍳', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', step: 1 },
  ready:     { label: 'Bereit',          emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   step: 2 },
  delivered: { label: 'Geliefert',       emoji: '🎉', color: '#C7A17A', bg: 'rgba(199,161,122,0.1)', step: 3 },
  cancelled: { label: 'Storniert',       emoji: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   step: -1 },
}
const ACTIVE_STATUSES = ['pending', 'preparing', 'ready']
const STATUS_STEPS = ['pending', 'preparing', 'ready', 'delivered']

const ORDER_TYPE_LABELS: Record<string, string> = {
  takeaway:  '🛍️ Abholung',
  delivery:  '🛵 Lieferung',
  'in-store':'📱 Vor Ort',
}

type Tab = 'profile' | 'orders' | 'loyalty' | 'abo'
type AuthMode = 'login' | 'register'

// ─── Style tokens ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 12px 12px 40px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0f0',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

// ─── Login/Register View ──────────────────────────────────────────────────────

function AuthView({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    setError(null)
    if (!email.trim() || !password) { setError('Bitte alle Felder ausfüllen.'); return }
    if (mode === 'register' && !name.trim()) { setError('Bitte deinen Namen eingeben.'); return }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return }

    startTransition(async () => {
      if (mode === 'login') {
        const result = await signInCustomer({ projectId: '', email, password })
        if ('error' in result) { setError(result.error); return }
      } else {
        const result = await signUpCustomer({
          projectId: '', name, email, password,
          consentPush: false, consentEmail: false,
        })
        if ('error' in result) { setError(result.error); return }
      }
      onSuccess()
    })
  }

  return (
    <div style={{ background: '#080808', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <div aria-hidden style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(199,161,122,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%', padding: '0 20px 60px', position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

        {/* Top Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#6b7280', fontSize: '13px', fontWeight: 600, marginBottom: '24px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#C7A17A')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            <ArrowLeft style={{ width: '15px', height: '15px' }} />
            Zurück zur Startseite
          </Link>
          <div>
            <Link href="/" aria-label="Bizzn Startseite">
              <Image src="/logo.svg" alt="Bizzn" width={120} height={48} style={{ width: '120px', height: 'auto', margin: '0 auto 20px', display: 'block' }} priority />
            </Link>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px', padding: '32px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>

          {/* Avatar icon */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(199,161,122,0.3), rgba(199,100,60,0.2))',
            border: '2px solid rgba(199,161,122,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User style={{ width: '22px', height: '22px', color: '#C7A17A' }} />
          </div>

          <h1 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '22px', textAlign: 'center', margin: '0 0 4px' }}>
            {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', margin: '0 0 28px' }}>
            {mode === 'login' ? 'Melde dich mit deinem Kundenkonto an' : 'Erstelle dein kostenloses Bizzn-Konto'}
          </p>

          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', marginBottom: '24px' }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, transition: 'all 0.18s',
                  background: mode === m ? 'rgba(199,161,122,0.15)' : 'transparent',
                  color: mode === m ? '#C7A17A' : '#6b7280',
                  boxShadow: mode === m ? 'inset 0 0 0 1px rgba(199,161,122,0.2)' : 'none',
                }}
              >
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Name (nur Register) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" style={labelStyle}>Name *</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563', pointerEvents: 'none' }} />
                  <input
                    id="auth-name" type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Dein Name"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>
            )}

            {/* E-Mail */}
            <div>
              <label htmlFor="auth-email" style={labelStyle}>E-Mail *</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563', pointerEvents: 'none' }} />
                <input
                  id="auth-email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="du@beispiel.de"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            {/* Passwort */}
            <div>
              <label htmlFor="auth-password" style={labelStyle}>Passwort *</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563', pointerEvents: 'none' }} />
                <input
                  id="auth-password" type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={mode === 'register' ? 'Mind. 6 Zeichen' : '••••••••'}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: '4px' }}
                >
                  {showPw ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit"
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
                background: isPending ? 'rgba(199,161,122,0.35)' : 'linear-gradient(135deg, #c7a17a, #d4a870)',
                color: '#111', fontWeight: 900, fontSize: '14px',
                boxShadow: isPending ? 'none' : '0 4px 20px rgba(199,161,122,0.3)',
                transition: 'all 0.2s', marginTop: '4px',
              }}
            >
              {isPending
                ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }} /> Bitte warten…</>
                : mode === 'login' ? 'Anmelden' : 'Konto erstellen'
              }
            </button>
          </div>

          {/* Gastronomen-Hinweis */}
          <p style={{ color: '#374151', fontSize: '11px', textAlign: 'center', marginTop: '20px', lineHeight: '1.6' }}>
            Du bist Gastronom?{' '}
            <a href="/auth/login" style={{ color: '#4b5563', textDecoration: 'underline' }}>
              Zum Restaurant-Login →
            </a>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  )
}

// ─── Account View (eingeloggt) ────────────────────────────────────────────────

export default function MeinKontoPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<OrderHistoryItem[]>([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  // Live-Status-Map: orderId -> aktueller Status (wird durch Realtime aktualisiert)
  const [liveStatus, setLiveStatus] = useState<Record<string, string>>({})
  const [loyaltyBalances, setLoyaltyBalances] = useState<LoyaltyBalance[]>([])
  const [loyaltyLoaded, setLoyaltyLoaded] = useState(false)

  // M27: Bizzn-Pass
  const [passInfo, setPassInfo] = useState<{
    hasPass: boolean
    status: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null>(null)
  const [passLoaded, setPassLoaded] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState<string | null>(null)
  // Stripe Payment Element (lazy)
  const [stripeElements, setStripeElements] = useState<{
    stripe: import('@stripe/stripe-js').Stripe
    elements: import('@stripe/stripe-js').StripeElements
  } | null>(null)
  const [subscriptionClientSecret, setSubscriptionClientSecret] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)

  // Edit state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const loadProfile = async () => {
    const s = await getCustomerSession()
    if (!s.userId) { setIsLoggedIn(false); setLoading(false); return }
    setIsLoggedIn(true)
    const p = await getCustomerProfile()
    if (p) { setProfile(p); setName(p.name); setPhone(p.phone ?? '') }
    setLoading(false)
  }

  useEffect(() => { loadProfile() }, [])

  // Lazy-load orders
  useEffect(() => {
    if (tab === 'orders' && !ordersLoaded) {
      getMyOrders().then(o => { setOrders(o); setOrdersLoaded(true) })
    }
  }, [tab, ordersLoaded])

  // Live-Status für aktive Bestellungen (Realtime + Polling)
  const activeOrderIds = useCallback(
    () => orders.filter(o => ACTIVE_STATUSES.includes(o.status)).map(o => o.id),
    [orders]
  )

  useEffect(() => {
    const ids = activeOrderIds()
    if (ids.length === 0) return

    const sb = createClient()

    const fetchActive = async () => {
      const { data } = await sb
        .from('orders')
        .select('id, status')
        .in('id', ids)
      if (data) {
        setLiveStatus(prev => {
          const next = { ...prev }
          data.forEach(o => { next[o.id] = o.status })
          return next
        })
      }
    }
    void fetchActive()

    // Realtime für sofortige Updates
    const channels = ids.map(id =>
      sb.channel(`account-order-${id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'orders',
          filter: `id=eq.${id}`,
        }, payload => {
          const newStatus = (payload.new as { status: string }).status
          setLiveStatus(prev => ({ ...prev, [id]: newStatus }))
        })
        .subscribe()
    )

    // Polling alle 10s als Fallback
    const poll = setInterval(fetchActive, 10_000)

    return () => {
      clearInterval(poll)
      channels.forEach(ch => { void sb.removeChannel(ch) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersLoaded])

  // Lazy-load loyalty
  useEffect(() => {
    if (tab === 'loyalty' && !loyaltyLoaded) {
      fetch('/api/loyalty/balance')
        .then(r => r.ok ? r.json() : [])
        .then(d => { setLoyaltyBalances(Array.isArray(d) ? d : []); setLoyaltyLoaded(true) })
        .catch(() => setLoyaltyLoaded(true))
    }
  }, [tab, loyaltyLoaded])

  // M27: Lazy-load Bizzn-Pass info
  useEffect(() => {
    if (tab === 'abo' && !passLoaded) {
      fetch('/api/bizzn-pass/status')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) setPassInfo(d)
          setPassLoaded(true)
        })
        .catch(() => setPassLoaded(true))
    }
  }, [tab, passLoaded])

  // M27: Abo starten — Subscription erstellen + Stripe Payment Element mounten
  const handleStartSubscription = async () => {
    setPassError(null)
    setPassLoading(true)
    try {
      const res = await fetch('/api/stripe/bizzn-pass/subscribe', { method: 'POST' })
      const data = await res.json() as { clientSecret?: string; error?: string }
      if (!res.ok || !data.clientSecret) {
        setPassError(data.error ?? 'Fehler beim Starten des Abonnements.')
        setPassLoading(false)
        return
      }
      setSubscriptionClientSecret(data.clientSecret)

      // Stripe.js lazy-load
      const { loadStripe } = await import('@stripe/stripe-js')
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (!stripe) { setPassError('Stripe konnte nicht geladen werden.'); setPassLoading(false); return }

      const elements = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: 'night',
          variables: { colorPrimary: '#C7A17A', colorBackground: '#111', borderRadius: '10px' },
        },
      })
      elements.create('payment').mount('#bizzn-pass-payment-element')
      setStripeElements({ stripe, elements })
    } catch {
      setPassError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setPassLoading(false)
    }
  }

  // M27: Zahlung bestätigen
  const handleConfirmPayment = async () => {
    if (!stripeElements) return
    setSubscribing(true)
    setPassError(null)
    const { error } = await stripeElements.stripe.confirmPayment({
      elements: stripeElements.elements,
      confirmParams: {
        return_url: `${window.location.origin}/mein-konto?tab=abo&success=1`,
      },
    })
    if (error) {
      setPassError(error.message ?? 'Zahlung fehlgeschlagen.')
      setSubscribing(false)
    }
    // Bei Erfolg leitet Stripe weiter
  }

  // M27: Abo kündigen via Stripe Portal
  const handleManageSubscription = async () => {
    setPassLoading(true)
    try {
      const res = await fetch('/api/stripe/bizzn-pass/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
      else setPassError(data.error ?? 'Portal konnte nicht geöffnet werden.')
    } catch {
      setPassError('Netzwerkfehler.')
    } finally {
      setPassLoading(false)
    }
  }

  const handleSaveProfile = () => {
    setSaveError(null); setSaveSuccess(false)
    startTransition(async () => {
      const result = await updateCustomerProfile({ name, phone })
      if ('error' in result) { setSaveError(result.error) }
      else {
        setSaveSuccess(true)
        setProfile(prev => prev ? { ...prev, name, phone: phone || null } : prev)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    })
  }

  const handleLogout = async () => {
    // Client-side signOut to avoid Next.js middleware redirect to /auth/login
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setProfile(null)
    setOrders([])
    setOrdersLoaded(false)
    setName('')
    setPhone('')
  }

  // ── Laden ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: '#080808', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid rgba(199,161,122,0.15)', borderTopColor: '#C7A17A',
            margin: '0 auto 14px', animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#4b5563', fontSize: '13px' }}>Wird geladen…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Nicht eingeloggt → Login-Form ─────────────────────────────────────────
  if (!isLoggedIn) {
    return <AuthView onSuccess={() => { setLoading(true); loadProfile() }} />
  }

  const initials = name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  // ── Eingeloggt → Konto ────────────────────────────────────────────────────
  return (
    <div style={{ background: '#080808', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div aria-hidden style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(199,161,122,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px 60px', position: 'relative', zIndex: 1 }}>

        {/* Top Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 20px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#6b7280', fontSize: '13px', fontWeight: 600, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#C7A17A')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Zurück zur Startseite
          </Link>
          <Link href="/" aria-label="Bizzn Startseite">
            <Image src="/logo.svg" alt="Bizzn" width={80} height={32} style={{ width: '80px', height: 'auto' }} priority />
          </Link>
        </div>

        {/* Profile Header */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', padding: '24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(199,161,122,0.3), rgba(199,100,60,0.2))',
            border: '2px solid rgba(199,161,122,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#C7A17A', fontWeight: 900, fontSize: '18px',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
              <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '17px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.name || 'Kein Name gesetzt'}
              </p>
              {passInfo?.hasPass && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                  background: 'linear-gradient(135deg, rgba(199,161,122,0.2), rgba(212,168,112,0.12))',
                  border: '1px solid rgba(199,161,122,0.4)', color: '#C7A17A',
                }}>
                  <Crown style={{ width: '10px', height: '10px' }} /> Bizzn-Pass
                </span>
              )}
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
              color: '#ef4444', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          >
            <LogOut style={{ width: '13px', height: '13px' }} />
            Abmelden
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', padding: '4px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', marginBottom: '20px',
        }}>
          {([
            { key: 'profile' as Tab, label: 'Profil',        icon: <User style={{ width: '14px', height: '14px' }} /> },
            { key: 'orders' as Tab,  label: 'Bestellungen',  icon: <ShoppingBag style={{ width: '14px', height: '14px' }} /> },
            { key: 'loyalty' as Tab, label: 'Bonuskarte',    icon: <Star style={{ width: '14px', height: '14px' }} /> },
            { key: 'abo' as Tab,     label: 'Pass',          icon: <Crown style={{ width: '14px', height: '14px' }} /> },
          ]).map(t => (
            <button
              key={t.key} id={`account-tab-${t.key}`} onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, transition: 'all 0.18s',
                background: tab === t.key
                  ? (t.key === 'abo' ? 'linear-gradient(135deg, rgba(199,161,122,0.2), rgba(212,168,112,0.12))' : 'rgba(199,161,122,0.12)')
                  : 'transparent',
                color: tab === t.key ? '#C7A17A' : '#6b7280',
                boxShadow: tab === t.key ? 'inset 0 0 0 1px rgba(199,161,122,0.2)' : 'none',
              }}
            >
              {t.icon}{t.label}
              {t.key === 'abo' && passInfo?.hasPass && (
                <span style={{ fontSize: '10px', background: 'rgba(199,161,122,0.15)', padding: '1px 5px', borderRadius: '999px', color: '#C7A17A' }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: PROFIL */}
        {tab === 'profile' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '24px' }}>
            <h2 style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '16px', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User style={{ width: '16px', height: '16px', color: '#C7A17A' }} />
              Profil bearbeiten
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="profile-name" style={labelStyle}>Name *</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563', pointerEvents: 'none' }} />
                  <input id="profile-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>E-Mail (nicht änderbar)</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#374151', pointerEvents: 'none' }} />
                  <input type="email" value={profile?.email ?? ''} readOnly style={{ ...inputStyle, color: '#4b5563', cursor: 'default', background: 'rgba(255,255,255,0.02)' }} />
                </div>
                <p style={{ color: '#374151', fontSize: '11px', margin: '4px 0 0 2px' }}>E-Mail-Änderung bitte an support@bizzn.de</p>
              </div>
              <div>
                <label htmlFor="profile-phone" style={labelStyle}>Telefon</label>
                <div style={{ position: 'relative' }}>
                  <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563', pointerEvents: 'none' }} />
                  <input id="profile-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 171 1234567" style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
              </div>
              {saveError && <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px' }}>{saveError}</div>}
              {saveSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle style={{ width: '15px', height: '15px' }} />Profil erfolgreich gespeichert!
                </div>
              )}
              <button id="profile-save" onClick={handleSaveProfile} disabled={isPending} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
                background: isPending ? 'rgba(199,161,122,0.35)' : 'linear-gradient(135deg, #c7a17a, #d4a870)',
                color: '#111', fontWeight: 900, fontSize: '14px',
                boxShadow: isPending ? 'none' : '0 4px 20px rgba(199,161,122,0.3)',
                transition: 'all 0.2s', marginTop: '4px',
              }}>
                {isPending
                  ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }} /> Wird gespeichert…</>
                  : <><Save style={{ width: '16px', height: '16px' }} /> Änderungen speichern</>
                }
              </button>
            </div>
          </div>
        )}

        {/* TAB: BESTELLUNGEN */}
        {tab === 'orders' && (
          <div>
            <h2 style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '16px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag style={{ width: '16px', height: '16px', color: '#C7A17A' }} />
              Meine Bestellungen
            </h2>
            {!ordersLoaded && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(199,161,122,0.15)', borderTopColor: '#C7A17A', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#4b5563', fontSize: '13px' }}>Bestellungen werden geladen…</p>
              </div>
            )}
            {ordersLoaded && orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(199,161,122,0.06)', border: '1px solid rgba(199,161,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Package style={{ width: '24px', height: '24px', color: '#4b5563' }} />
                </div>
                <p style={{ color: '#9ca3af', fontWeight: 700, fontSize: '15px', margin: '0 0 6px' }}>Noch keine Bestellungen</p>
                <p style={{ color: '#4b5563', fontSize: '13px', margin: '0 0 20px' }}>Entdecke lokale Restaurants und bestell direkt.</p>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'rgba(199,161,122,0.1)', color: '#C7A17A', border: '1px solid rgba(199,161,122,0.2)', textDecoration: 'none' }}>
                  Restaurants entdecken <ChevronRight style={{ width: '14px', height: '14px' }} />
                </Link>
              </div>
            )}
            {ordersLoaded && orders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map(order => {
                  const currentStatus = liveStatus[order.id] ?? order.status
                  const sc = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.pending
                  const isActive = ACTIVE_STATUSES.includes(currentStatus)
                  const stepIdx = STATUS_STEPS.indexOf(currentStatus)
                  return (
                    <div key={order.id} style={{
                      background: isActive ? `${sc.bg}` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? sc.color + '30' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '16px', padding: '16px 18px', transition: 'all 0.3s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '14px', margin: '0 0 2px' }}>{order.restaurant_name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#6b7280', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock style={{ width: '11px', height: '11px' }} />{formatDate(order.created_at)}
                            </span>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>{ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}</span>
                          </div>
                        </div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                          background: sc.bg, color: sc.color, flexShrink: 0, whiteSpace: 'nowrap',
                          animation: isActive ? 'livePulse 2s ease-in-out infinite' : 'none',
                        }}>
                          {sc.emoji} {sc.label}
                          {isActive && (
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: sc.color, animation: 'dotPulse 1.4s ease-in-out infinite' }} />
                          )}
                        </span>
                      </div>

                      {isActive && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                            {STATUS_STEPS.map((s, i) => {
                              const done = i <= stepIdx
                              const stepCfg = STATUS_CONFIG[s]
                              return (
                                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <div style={{
                                    height: '4px', width: '100%', borderRadius: '999px',
                                    background: done ? stepCfg.color : 'rgba(255,255,255,0.08)',
                                    transition: 'background 0.5s',
                                  }} />
                                  <span style={{ fontSize: '9px', color: done ? stepCfg.color : '#374151', fontWeight: done ? 700 : 500, textAlign: 'center', lineHeight: 1.2 }}>
                                    {stepCfg.emoji}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
                        {order.items.slice(0, 3).map((item, i) => (
                          <p key={i} style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
                            {item.quantity}× {item.name}
                            {item.price > 0 && <span style={{ color: '#6b7280' }}> · {eur(item.price * item.quantity)}</span>}
                          </p>
                        ))}
                        {order.items.length > 3 && <p style={{ color: '#4b5563', fontSize: '12px', margin: 0 }}>+ {order.items.length - 3} weitere</p>}
                      </div>

                      {order.total_amount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                          <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Gesamt</span>
                          <span style={{ color: '#C7A17A', fontSize: '13px', fontWeight: 800 }}>{eur(order.total_amount)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: BONUSKARTE */}
        {tab === 'loyalty' && (
          <div>
            <h2 style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '16px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star style={{ width: '16px', height: '16px', color: '#C7A17A' }} />
              Meine Bonuskarten
            </h2>
            {!loyaltyLoaded && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(199,161,122,0.15)', borderTopColor: '#C7A17A', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#4b5563', fontSize: '13px' }}>Bonuskarten werden geladen…</p>
              </div>
            )}
            {loyaltyLoaded && loyaltyBalances.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(199,161,122,0.06)', border: '1px solid rgba(199,161,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Star style={{ width: '24px', height: '24px', color: '#4b5563' }} />
                </div>
                <p style={{ color: '#9ca3af', fontWeight: 700, fontSize: '15px', margin: '0 0 6px' }}>Noch keine Bonuspunkte</p>
                <p style={{ color: '#4b5563', fontSize: '13px', margin: '0 0 20px' }}>
                  Bestelle bei einem Bizzn-Restaurant — {passInfo?.hasPass ? '15 %' : '10 %'} jeder Bestellung werden automatisch gutgeschrieben.
                  {passInfo?.hasPass && <span style={{ color: '#C7A17A', fontWeight: 700 }}> (Bizzn-Pass Bonus!)</span>}
                </p>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'rgba(199,161,122,0.1)', color: '#C7A17A', border: '1px solid rgba(199,161,122,0.2)', textDecoration: 'none' }}>
                  Restaurants entdecken <ChevronRight style={{ width: '14px', height: '14px' }} />
                </Link>
              </div>
            )}
            {loyaltyLoaded && loyaltyBalances.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loyaltyBalances.map(lb => {
                  const fillCount = Math.min(lb.order_count, 5)
                  const isReadyToRedeem = lb.order_count >= 5 && lb.balance_cents > 0
                  const expiresAt = lb.expires_at ? new Date(lb.expires_at) : null
                  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                  return (
                    <div key={lb.id} style={{
                      background: isReadyToRedeem
                        ? 'linear-gradient(135deg, rgba(199,161,122,0.1) 0%, rgba(199,100,60,0.07) 100%)'
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isReadyToRedeem ? 'rgba(199,161,122,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '16px', padding: '18px 20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        {lb.project_cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={lb.project_cover} alt={lb.project_name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(199,161,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '18px' }}>🍽</span>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '14px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lb.project_name}</p>
                          {isReadyToRedeem && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', borderRadius: '999px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: '11px', fontWeight: 700 }}>
                              <Zap style={{ width: '10px', height: '10px' }} />Einlösung bei nächster Bestellung!
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ color: '#C7A17A', fontWeight: 900, fontSize: '16px', margin: 0 }}>{eur(lb.balance_cents)}</p>
                          <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>Guthaben</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} style={{
                            flex: 1, height: '6px', borderRadius: '999px',
                            background: i < fillCount ? '#C7A17A' : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>
                          {fillCount}/5 Bestellungen
                          {!isReadyToRedeem && ` — noch ${5 - fillCount} bis zum Bonus`}
                        </span>
                        {daysLeft !== null && daysLeft <= 30 && (
                          <span style={{ color: daysLeft <= 7 ? '#ef4444' : '#f59e0b', fontSize: '11px', fontWeight: 700 }}>
                            ⏰ Läuft in {daysLeft}d ab
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop: '20px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: '#4b5563', fontSize: '12px', margin: 0, lineHeight: '1.7' }}>
                🏆 <strong style={{ color: '#6b7280' }}>Wie es funktioniert:</strong> Du sammelst {passInfo?.hasPass ? '15 %' : '10 %'} jedes Bestellwerts als Guthaben — pro Restaurant separat. Nach 5 Bestellungen wird das Guthaben automatisch bei der 6. Bestellung abgezogen. Guthaben verfällt nach 90 Tagen Inaktivität.
                {passInfo?.hasPass && <> <span style={{ color: '#C7A17A', fontWeight: 700 }}>Dein Bizzn-Pass erhöht die Rate auf 15 %! 👑</span></>}
              </p>
            </div>
          </div>
        )}

        {/* TAB: ABO (Bizzn-Pass) */}
        {tab === 'abo' && (
          <div>
            <h2 style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '16px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown style={{ width: '16px', height: '16px', color: '#C7A17A' }} />
              Bizzn-Pass
            </h2>

            {/* Laden */}
            {!passLoaded && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(199,161,122,0.15)', borderTopColor: '#C7A17A', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#4b5563', fontSize: '13px' }}>Wird geladen…</p>
              </div>
            )}

            {/* Aktiver Pass — Verwaltungs-Ansicht */}
            {passLoaded && passInfo?.hasPass && (
              <div>
                {/* Status Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(199,161,122,0.15) 0%, rgba(199,100,60,0.08) 100%)',
                  border: '1px solid rgba(199,161,122,0.35)',
                  borderRadius: '20px', padding: '24px', marginBottom: '16px',
                  animation: 'passGlow 3s ease-in-out infinite',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(199,161,122,0.3), rgba(212,168,112,0.2))',
                      border: '1px solid rgba(199,161,122,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Crown style={{ width: '22px', height: '22px', color: '#C7A17A' }} />
                    </div>
                    <div>
                      <p style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '16px', margin: '0 0 2px' }}>Bizzn-Pass Aktiv 👑</p>
                      <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>4,99 €/Monat</p>
                    </div>
                    <span style={{
                      marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                      background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80',
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'dotPulse 1.4s ease-in-out infinite' }} />
                      Aktiv
                    </span>
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { icon: <Star style={{ width: '14px', height: '14px', color: '#C7A17A' }} />, text: '15 % Loyalty-Gutschrift statt 10 %' },
                      { icon: <Car style={{ width: '14px', height: '14px', color: '#C7A17A' }} />, text: 'Drive-In: Essen wird zum Auto gebracht' },
                      { icon: <Sparkles style={{ width: '14px', height: '14px', color: '#C7A17A' }} />, text: 'Bizzn-Pass Badge auf deinem Profil' },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {f.icon}
                        <span style={{ color: '#d1d5db', fontSize: '13px' }}>{f.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Period info */}
                  {passInfo.currentPeriodEnd && (
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 16px' }}>
                      {passInfo.cancelAtPeriodEnd
                        ? `⚠️ Abo endet am ${new Date(passInfo.currentPeriodEnd).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`
                        : `Nächste Abrechnung: ${new Date(passInfo.currentPeriodEnd).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`
                      }
                    </p>
                  )}

                  {/* Manage Button */}
                  <button
                    id="bizzn-pass-manage"
                    onClick={handleManageSubscription}
                    disabled={passLoading}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(199,161,122,0.25)',
                      cursor: passLoading ? 'not-allowed' : 'pointer',
                      background: 'rgba(199,161,122,0.08)', color: '#C7A17A',
                      fontWeight: 700, fontSize: '13px', transition: 'all 0.18s',
                    }}
                  >
                    {passLoading
                      ? <><Loader2 style={{ width: '14px', height: '14px', animation: 'spin 0.8s linear infinite' }} /> Öffne Portal…</>
                      : 'Abo verwalten / kündigen →'
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Kein Pass — Marketing + Abonnieren */}
            {passLoaded && !passInfo?.hasPass && (
              <div>
                {/* Hero Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '28px', marginBottom: '16px', textAlign: 'center',
                }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, rgba(199,161,122,0.2), rgba(199,100,60,0.12))',
                    border: '1px solid rgba(199,161,122,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Crown style={{ width: '28px', height: '28px', color: '#C7A17A' }} />
                  </div>
                  <h3 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '20px', margin: '0 0 6px' }}>
                    Bizzn-Pass 👑
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.6' }}>
                    Das Premium-Abo für alle, die lokal lieben.<br />
                    <strong style={{ color: '#C7A17A' }}>4,99 €/Monat</strong> — jederzeit kündbar.
                  </p>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '24px' }}>
                    {[
                      { emoji: '⭐', title: 'Stempel-Booster', desc: '15 % statt 10 % Gutschrift auf deine Bonuskarte' },
                      { emoji: '🚗', title: 'Drive-In VIP-Abholung', desc: 'Essen wird direkt zu deinem Auto gebracht' },
                      { emoji: '👑', title: 'Exklusives Badge', desc: 'Zeige dein Bizzn-Pass-Icon auf deinem Profil' },
                    ].map((f, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '12px 14px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>{f.emoji}</span>
                        <div>
                          <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{f.title}</p>
                          <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, lineHeight: '1.5' }}>{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subscribe Button — wenn noch kein Payment Element */}
                  {!subscriptionClientSecret && (
                    <button
                      id="bizzn-pass-subscribe"
                      onClick={handleStartSubscription}
                      disabled={passLoading}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                        cursor: passLoading ? 'not-allowed' : 'pointer',
                        background: passLoading ? 'rgba(199,161,122,0.35)' : 'linear-gradient(135deg, #c7a17a, #d4a870)',
                        color: '#111', fontWeight: 900, fontSize: '15px',
                        boxShadow: passLoading ? 'none' : '0 4px 24px rgba(199,161,122,0.35)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {passLoading
                        ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }} /> Wird vorbereitet…</>
                        : <><Crown style={{ width: '16px', height: '16px' }} /> Jetzt für 4,99 €/Monat abonnieren</>
                      }
                    </button>
                  )}

                  {/* Stripe Payment Element */}
                  {subscriptionClientSecret && (
                    <div style={{ marginTop: '8px', textAlign: 'left' }}>
                      <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
                        🔒 Sichere Zahlung via Stripe
                      </p>
                      <div id="bizzn-pass-payment-element" style={{ marginBottom: '16px' }} />
                      <button
                        id="bizzn-pass-confirm"
                        onClick={handleConfirmPayment}
                        disabled={subscribing || !stripeElements}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                          cursor: (subscribing || !stripeElements) ? 'not-allowed' : 'pointer',
                          background: (subscribing || !stripeElements) ? 'rgba(199,161,122,0.35)' : 'linear-gradient(135deg, #c7a17a, #d4a870)',
                          color: '#111', fontWeight: 900, fontSize: '15px',
                          boxShadow: (subscribing || !stripeElements) ? 'none' : '0 4px 24px rgba(199,161,122,0.35)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {subscribing
                          ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }} /> Zahlung wird abgeschlossen…</>
                          : <><Crown style={{ width: '16px', height: '16px' }} /> Bizzn-Pass aktivieren</>
                        }
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ color: '#374151', fontSize: '11px', textAlign: 'center', lineHeight: '1.6' }}>
                  Keine Mindestlaufzeit. Jederzeit in deinem Konto oder im Stripe-Portal kündbar.
                </p>
              </div>
            )}

            {/* Error */}
            {passError && (
              <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px' }}>
                {passError}
              </div>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.7} } @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} } @keyframes passGlow { 0%,100%{box-shadow:0 0 20px rgba(199,161,122,0.1)} 50%{box-shadow:0 0 40px rgba(199,161,122,0.3)} } * { box-sizing: border-box; }`}</style>
    </div>
  )
}
