'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, UtensilsCrossed, ChevronRight, Zap, Sparkles, ArrowRight, User } from 'lucide-react'
import RestaurantSlideIn from '@/components/discovery/RestaurantSlideIn'
import { getCustomerSession } from '@/app/actions/customer'

interface Restaurant {
  id: string
  name: string
  slug: string | null
  description: string | null
  cuisine_type: string | null
  cover_image_url: string | null
  city: string | null
  address: string | null
  postal_code: string | null
  deal_badge: string | null
  is_new: boolean
}

type FilterMode = 'all' | 'deals' | 'new'

const CUISINE_OPTIONS = [
  { label: 'Alle',        emoji: '🍽️' },
  { label: 'Pizza',       emoji: '🍕' },
  { label: 'Burger',      emoji: '🍔' },
  { label: 'Asiatisch',   emoji: '🍜' },
  { label: 'Sushi',       emoji: '🍣' },
  { label: 'Türkisch',    emoji: '🥙' },
  { label: 'Italienisch', emoji: '🍝' },
  { label: 'Griechisch',  emoji: '🫒' },
  { label: 'Indisch',     emoji: '🍛' },
  { label: 'Japanisch',   emoji: '🍱' },
]



export default function Home() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  // Load customer session once
  useEffect(() => {
    getCustomerSession().then(s => {
      if (s.userId) setCustomerName(s.name ?? s.email?.split('@')[0] ?? 'Konto')
      setSessionReady(true)
    })
  }, [])

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cityFilter.trim()) params.set('city', cityFilter.trim())
    if (cuisineFilter && cuisineFilter !== 'Alle') params.set('cuisine', cuisineFilter)
    if (filterMode === 'deals') params.set('deals', '1')
    if (filterMode === 'new') params.set('new', '1')
    try {
      const res = await fetch(`/api/discovery?${params.toString()}`)
      const json = await res.json()
      setRestaurants(json.restaurants ?? [])
      setSelected(null)
    } catch {
      setRestaurants([])
    }
    setLoading(false)
  }, [cityFilter, cuisineFilter, filterMode])

  // Initial load + auto-refetch when cuisine/mode filter changes
  // cityFilter intentionally excluded: search is triggered manually via button/Enter
  useEffect(() => {
    fetchRestaurants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuisineFilter, filterMode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSuccess(true)
    setIsSubmitting(false)
  }

  const activeCuisine = cuisineFilter || 'Alle'

  return (
    <div style={{ background: '#16161E', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Ambient glows ── */}
      <div aria-hidden style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '900px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(232,184,109,0.18) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: 'fixed', bottom: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(232,150,80,0.09) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─────── HERO ─────── */}
      <header className="relative z-10" style={{ paddingTop: '20px', paddingBottom: '8px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>

          {/* Top-right: Login-Button (ausgeloggt) oder User-Pill (eingeloggt) */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20, opacity: sessionReady ? 1 : 0, transition: 'opacity 0.2s' }}>
            {customerName ? (
              <Link
                href="/mein-konto"
                id="user-account-pill"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  padding: '7px 13px', borderRadius: '999px',
                  background: 'rgba(232,184,109,0.1)', border: '1px solid rgba(232,184,109,0.25)',
                  color: '#E8B86D', textDecoration: 'none', fontSize: '12px', fontWeight: 700,
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,184,109,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,184,109,0.1)' }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'rgba(232,184,109,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User style={{ width: '12px', height: '12px' }} />
                </div>
                {customerName}
              </Link>
            ) : (
              <Link
                href="/mein-konto"
                id="header-login-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#9ca3af', textDecoration: 'none', transition: 'all 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              >
                <User style={{ width: '13px', height: '13px' }} />
                Anmelden
              </Link>
            )}
          </div>

          {/* Logo — SVG hat internen Leerraum, daher Clip-Wrapper */}
          <div style={{ height: '280px', overflow: 'hidden', position: 'relative', margin: '0 auto 20px' }}>
            <Link href="/" aria-label="Bizzn Startseite" style={{ display: 'block' }}>
              <Image src="/logo.svg" alt="Bizzn Logo" width={420} height={420}
                style={{
                  width: '420px', height: 'auto',
                  position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                  top: '-70px',
                  transition: 'all 0.3s ease',
                }}
                priority />
            </Link>
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 14px', borderRadius: '999px',
            border: '1px solid rgba(232,184,109,0.35)',
            color: 'var(--brand-accent)', background: 'rgba(232,184,109,0.08)',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            <Sparkles className="w-3 h-3" />
            Lokale Restaurants entdecken
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900,
            lineHeight: 1.15, color: '#F0F0F8',
            letterSpacing: '-0.02em', marginBottom: '14px',
          }}>
            Direkt beim Restaurant bestellen.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #E8B86D 0%, #F2CE8A 50%, #E89060 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Ohne Provision.</span>
          </h1>

          <p style={{ color: '#A0A0B8', fontSize: '16px', lineHeight: '1.7', marginBottom: '28px', maxWidth: '500px', margin: '0 auto 28px' }}>
            Entdecke lokale Restaurants – und bestelle direkt.{' '}
            <span style={{ color: '#C0C0D0' }}>Kein Lieferando-Monopol.</span>
          </p>

          {/* ── Search bar ── */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px', padding: '14px', backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <MapPin className="w-4 h-4" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#7070A0' }} />
                <input
                  id="discovery-city"
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRestaurants()}
                  placeholder="Stadt oder PLZ, z.B. 09116"
                  style={{
                    width: '100%', padding: '12px 14px 12px 38px',
                    borderRadius: '12px', background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)', color: '#F0F0F8',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(232,184,109,0.55)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>
              <button
                id="discovery-search"
                onClick={fetchRestaurants}
                disabled={loading}
                style={{
                  padding: '12px 22px', borderRadius: '12px',
                  background: loading ? 'rgba(232,184,109,0.35)' : 'linear-gradient(135deg, #E8B86D, #D4A055)',
                  color: '#16161E', fontWeight: 800, fontSize: '14px',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  flexShrink: 0, whiteSpace: 'nowrap',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(232,184,109,0.30)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,184,109,0.40)' } }}
                onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(232,184,109,0.30)' } }}
              >
                <Search className="w-4 h-4" />
                {loading ? 'Suche…' : 'Suchen'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─────── CUISINE ICON BAR ─────── */}
      <div className="relative z-10" style={{ maxWidth: '760px', margin: '0 auto', width: '100%', padding: '0 20px 8px' }}>
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}>
          {CUISINE_OPTIONS.map((c) => {
            const isActive = activeCuisine === c.label
            return (
              <button
                key={c.label}
                id={`cuisine-icon-${c.label.toLowerCase()}`}
                onClick={() => setCuisineFilter(c.label === 'Alle' ? '' : c.label)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  flexShrink: 0, padding: '10px 14px', borderRadius: '14px',
                  background: isActive ? 'rgba(232,184,109,0.13)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? 'rgba(232,184,109,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  cursor: 'pointer', transition: 'all 0.18s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <span style={{ fontSize: '22px', lineHeight: 1 }}>{c.emoji}</span>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: isActive ? 'var(--brand-accent)' : '#8080A0',
                  whiteSpace: 'nowrap', transition: 'color 0.18s',
                }}>
                  {c.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─────── STICKY FILTER BAR ─────── */}
      <div className="relative z-10" style={{
        position: 'sticky', top: 0,
        background: 'rgba(22,22,30,0.90)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px' }}>
          {(
            [
              { mode: 'all' as FilterMode,   label: 'Alle', icon: null },
              { mode: 'deals' as FilterMode, label: 'Mit Angebot', icon: <Zap className="w-3 h-3" /> },
              { mode: 'new' as FilterMode,   label: 'Neu auf Bizzn', icon: <Sparkles className="w-3 h-3" /> },
            ]
          ).map(({ mode, label, icon }) => {
            const active = filterMode === mode
            return (
              <button
                key={mode}
                id={`filter-mode-${mode}`}
                onClick={() => setFilterMode(mode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                  border: `1px solid ${active ? 'rgba(232,184,109,0.55)' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? 'rgba(232,184,109,0.13)' : 'transparent',
                  color: active ? 'var(--brand-accent)' : '#8080A0',
                  cursor: 'pointer', transition: 'all 0.18s',
                  whiteSpace: 'nowrap',
                }}
              >
                {icon}{label}
              </button>
            )
          })}
          <span style={{ marginLeft: 'auto', color: '#8080A8', fontSize: '11px', fontWeight: 500 }}>
            {!loading && `${restaurants.length} Restaurant${restaurants.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* ─────── PROMO BANNER ─────── */}
      {!loading && restaurants.length > 0 && filterMode === 'all' && !cuisineFilter && !cityFilter && (
        <div className="relative z-10" style={{ maxWidth: '760px', margin: '16px auto 0', width: '100%', padding: '0 20px' }}>
          <div style={{
            borderRadius: '16px', padding: '16px 20px',
            background: 'rgba(232,184,109,0.05)',
            border: '1px solid rgba(232,184,109,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ color: '#F0F0F8', fontWeight: 800, fontSize: '13px', margin: 0 }}>
                🎉 Jetzt kostenlos auf Bizzn listen
              </p>
              <p style={{ color: '#9090A8', fontSize: '12px', margin: '3px 0 0' }}>
                0 % Provision — kein Lock-in — immer.
              </p>
            </div>
            <Link
              href="/auth/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                background: 'rgba(232,184,109,0.15)', color: 'var(--brand-accent)',
                border: '1px solid rgba(232,184,109,0.35)', textDecoration: 'none',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              Restaurant eintragen <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ─────── CONTENT AREA ─────── */}
      <div className="relative z-10 flex-1" style={{ maxWidth: '760px', margin: '0 auto', width: '100%', padding: '16px 20px 48px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '3px solid rgba(232,184,109,0.20)',
              borderTopColor: 'var(--brand-accent)',
              margin: '0 auto 14px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: '#8080A0', fontSize: '13px' }}>Restaurants werden geladen…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && restaurants.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '56px 24px',
            background: 'rgba(255,255,255,0.025)', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: 'rgba(232,184,109,0.08)', border: '1px solid rgba(232,184,109,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <UtensilsCrossed className="w-7 h-7" style={{ color: '#7070A0' }} />
            </div>
            <p style={{ color: '#C0C0D0', fontWeight: 700, fontSize: '15px', margin: '0 0 6px' }}>
              {filterMode === 'deals' ? 'Keine Angebote gefunden' : filterMode === 'new' ? 'Keine neuen Restaurants' : 'Keine Restaurants gefunden'}
            </p>
            <p style={{ color: '#8080A0', fontSize: '13px', margin: '0 0 20px' }}>
              {filterMode !== 'all' ? 'Versuche einen anderen Filter.' : 'Probiere eine andere Suche aus.'}
            </p>
            {filterMode !== 'all' && (
              <button
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                  background: 'rgba(232,184,109,0.12)', color: 'var(--brand-accent)',
                  border: '1px solid rgba(232,184,109,0.30)', cursor: 'pointer',
                }}
              >
                Alle anzeigen
              </button>
            )}
          </div>
        )}

        {/* Restaurant grid */}
        {!loading && restaurants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
            }}>
              {restaurants.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  isSelected={selected?.id === r.id}
                  onClick={() => setSelected(selected?.id === r.id ? null : r)}
                />
              ))}
            </div>

          </div>
        )}
      </div>

      {/* ─────── RESTAURANT SLIDE-IN (kein iframe) ─────── */}
      {selected && selected.slug && (
        <RestaurantSlideIn
          slug={selected.slug}
          restaurantName={selected.name}
          cuisineType={selected.cuisine_type}
          dealBadge={selected.deal_badge}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ─────── FOR RESTAURATEURS ─────── */}
      <section className="relative z-10" style={{ padding: '0 20px 48px', maxWidth: '760px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{
            background: 'rgba(232,184,109,0.05)', border: '1px solid rgba(232,184,109,0.20)',
            borderRadius: '20px', padding: '28px', textAlign: 'center',
          }}>
            <h2 style={{ color: '#F0F0F8', fontWeight: 800, fontSize: '18px', margin: '0 0 8px' }}>Du bist Gastronom?</h2>
            <p style={{ color: '#9090A8', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.7' }}>
              Starte kostenlos — keine Provision, kein Lock-in. Deine Speisekarte online in 10 Minuten.
            </p>
            {isSuccess ? (
              <div style={{ color: 'var(--brand-accent)', fontWeight: 800 }}>🎉 Danke! Wir melden uns in Kürze.</div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <input
                  id="early-access-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  disabled={isSubmitting}
                  style={{
                    padding: '11px 18px', borderRadius: '10px', width: '220px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)',
                    color: '#F0F0F8', fontSize: '14px', outline: 'none',
                  }}
                />
                <button
                  id="early-access-submit"
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  style={{
                    padding: '11px 20px', borderRadius: '10px',
                    background: isSubmitting || !email.trim() ? 'rgba(232,184,109,0.30)' : 'linear-gradient(135deg, #E8B86D, #D4A055)',
                    color: '#16161E', fontSize: '14px', fontWeight: 800,
                    border: 'none', cursor: isSubmitting || !email.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: isSubmitting || !email.trim() ? 'none' : '0 4px 16px rgba(232,184,109,0.25)',
                  }}
                >
                  {isSubmitting ? 'Wird eingetragen…' : <><ArrowRight className="w-4 h-4" />Vorabzugang sichern</>}
                </button>
              </form>
            )}
          </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10" style={{
        borderTop: '1px solid rgba(255,255,255,0.10)', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
      }}>
        <p style={{ color: '#6060A0', fontSize: '12px', margin: 0 }}>© 2026 Bizzn.de – Made for Restaurants.</p>
        <Link href="/auth/login" style={{ color: '#7070A0', fontSize: '12px', textDecoration: 'underline', transition: 'color 0.15s' }}>
          Gastronomen-Login →
        </Link>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::-webkit-scrollbar { display: none; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

// ─── Premium Restaurant Card ───────────────────────────────────────────────
function RestaurantCard({
  restaurant,
  isSelected,
  onClick,
}: {
  restaurant: Restaurant
  isSelected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      id={`restaurant-item-${restaurant.id}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left',
        background: isSelected ? 'rgba(232,184,109,0.10)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isSelected ? 'rgba(232,184,109,0.40)' : hovered ? 'rgba(232,184,109,0.22)' : 'rgba(255,255,255,0.10)'}`,
        borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', padding: 0,
        transform: hovered && !isSelected ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: hovered && !isSelected ? '0 12px 40px rgba(0,0,0,0.5)' : isSelected ? '0 0 0 1px rgba(232,184,109,0.25)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Cover */}
      <div style={{ height: '140px', overflow: 'hidden', position: 'relative', background: '#1A1A2E' }}>
        {restaurant.cover_image_url ? (
          <Image
            src={restaurant.cover_image_url}
            alt={restaurant.name}
            fill
            style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }}
            unoptimized
          />
        ) : (
          <div style={{
            height: '100%',
            background: `linear-gradient(135deg,
              hsl(${(restaurant.name.charCodeAt(0) * 17) % 30 + 220}, 35%, 14%) 0%,
              hsl(${(restaurant.name.charCodeAt(0) * 17) % 30 + 240}, 25%, 10%) 100%)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <UtensilsCrossed className="w-8 h-8" style={{ color: 'rgba(232,184,109,0.30)' }} />
            <span style={{ color: 'rgba(232,184,109,0.25)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Kein Bild</span>
          </div>
        )}

        {/* Badges overlay */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          display: 'flex', flexDirection: 'column', gap: '5px',
        }}>
          {restaurant.deal_badge && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '6px',
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
              color: '#fbbf24', fontSize: '10px', fontWeight: 800,
              border: '1px solid rgba(251,191,36,0.3)',
            }}>
              <Zap className="w-2.5 h-2.5" />
              {restaurant.deal_badge}
            </span>
          )}
          {restaurant.is_new && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '6px',
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
              color: '#34d399', fontSize: '10px', fontWeight: 800,
              border: '1px solid rgba(52,211,153,0.3)',
            }}>
              <Sparkles className="w-2.5 h-2.5" />
              Neu
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#F0F0F8', fontWeight: 700, fontSize: '14px', margin: '0 0 3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {restaurant.name}
          </p>
          {restaurant.cuisine_type && (
            <p style={{ color: 'var(--brand-accent)', fontSize: '11px', fontWeight: 600, margin: '0 0 4px', opacity: 1 }}>
              {restaurant.cuisine_type}
            </p>
          )}
          {(restaurant.postal_code || restaurant.city) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MapPin className="w-3 h-3" style={{ color: '#7070A0', flexShrink: 0 }} />
              <span style={{ color: '#8080A8', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[restaurant.postal_code, restaurant.city].filter(Boolean).join(' ')}
              </span>
            </div>
          )}
        </div>
        <ChevronRight
          className="w-4 h-4 flex-shrink-0"
          style={{
            color: isSelected ? 'var(--brand-accent)' : '#5050A0',
            transform: isSelected ? 'rotate(90deg)' : 'none',
            transition: 'all 0.2s', marginTop: '2px',
          }}
        />
      </div>
    </button>
  )
}
