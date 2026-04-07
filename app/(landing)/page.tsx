'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, UtensilsCrossed, ArrowRight, X, ChevronRight } from 'lucide-react'

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
}

const CUISINE_OPTIONS = ['Alle', 'Japanisch', 'Italienisch', 'Burger', 'Pizza', 'Sushi', 'Asiatisch', 'Griechisch', 'Türkisch', 'Indisch']

function getStorefrontUrl(slug: string | null): string {
  if (!slug) return ''
  const host = window.location.host
  if (host.includes('localhost')) {
    const port = host.split(':')[1] ?? '3000'
    return `http://${slug}.localhost:${port}/menu?mode=embedded`
  }
  return `https://${slug}.bizzn.de/menu?mode=embedded`
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [selected, setSelected] = useState<Restaurant | null>(null)

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    setHasSearched(true)
    const params = new URLSearchParams()
    if (cityFilter.trim()) params.set('city', cityFilter.trim())
    if (cuisineFilter && cuisineFilter !== 'Alle') params.set('cuisine', cuisineFilter)
    try {
      const res = await fetch(`/api/discovery?${params.toString()}`)
      const json = await res.json()
      setRestaurants(json.restaurants ?? [])
      setSelected(null)
    } catch {
      setRestaurants([])
    }
    setLoading(false)
  }, [cityFilter, cuisineFilter])

  useEffect(() => {
    if (cuisineFilter) fetchRestaurants()
  }, [cuisineFilter, fetchRestaurants])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSuccess(true)
    setIsSubmitting(false)
  }

  const showSplitView = selected !== null

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', top: '-160px', left: '50%', transform: 'translateX(-50%)',
        width: '700px', height: '400px', borderRadius: '50%',
        background: 'var(--brand-accent)', opacity: 0.06, filter: 'blur(120px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─────── HERO ─────── */}
      <header className="relative z-10 flex flex-col items-center text-center px-4 pt-10 pb-6"
        style={{ gap: '16px' }}>

        <Link href="/" aria-label="Bizzn Startseite">
          <Image src="/logo.svg" alt="Bizzn Logo" width={256} height={256}
            className="h-auto mx-auto"
            style={{ width: '220px', marginBottom: '-24px', transition: 'all 0.3s ease' }}
            priority />
        </Link>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '999px',
          border: '1px solid rgba(199,161,122,0.35)',
          color: 'var(--brand-accent)', background: 'rgba(199,161,122,0.08)',
          fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          🏙️ Lokale Restaurants entdecken
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-gray-200" style={{ maxWidth: '640px' }}>
          Direkt beim Restaurant bestellen.{' '}
          <span style={{ color: 'var(--brand-accent)' }}>Ohne Provision.</span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto" style={{ lineHeight: '1.7' }}>
          Entdecke lokale Restaurants — und bestelle direkt. Kein Lieferando-Monopol.
        </p>
      </header>

      {/* ─────── SEARCH BAR ─────── */}
      <div className="relative z-10 px-4 pb-4 max-w-4xl mx-auto w-full">
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '16px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
              <MapPin className="w-4 h-4 text-gray-500" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="discovery-city"
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRestaurants()}
                placeholder="Stadt oder PLZ, z.B. 09116"
                className="placeholder:text-gray-600"
                style={{
                  width: '100%', padding: '11px 14px 11px 36px',
                  borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
            <button
              id="discovery-search"
              onClick={fetchRestaurants}
              disabled={loading}
              style={{
                padding: '11px 22px', borderRadius: '10px',
                background: loading ? 'rgba(199,161,122,0.4)' : 'var(--brand-accent)',
                color: '#111', fontWeight: 700, fontSize: '14px',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
                transition: 'background 0.2s', flexShrink: 0,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brand-accent)' }}
            >
              <Search className="w-4 h-4" />
              {loading ? 'Suche…' : 'Suchen'}
            </button>
          </div>

          {/* Cuisine pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                id={`cuisine-filter-${c.toLowerCase()}`}
                onClick={() => setCuisineFilter(c === 'Alle' ? '' : c)}
                style={{
                  padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                  border: '1px solid',
                  borderColor: (cuisineFilter === c || (c === 'Alle' && !cuisineFilter)) ? 'var(--brand-accent)' : 'rgba(255,255,255,0.1)',
                  background: (cuisineFilter === c || (c === 'Alle' && !cuisineFilter)) ? 'rgba(199,161,122,0.12)' : 'transparent',
                  color: (cuisineFilter === c || (c === 'Alle' && !cuisineFilter)) ? 'var(--brand-accent)' : '#6b7280',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────── CONTENT AREA (Split-View oder Cards) ─────── */}
      <div className="relative z-10 flex-1 px-4 pb-8 max-w-4xl mx-auto w-full">

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '3px solid rgba(199,161,122,0.2)',
              borderTopColor: 'var(--brand-accent)',
              margin: '0 auto 12px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p className="text-gray-500 text-sm">Restaurants werden geladen…</p>
          </div>
        )}

        {/* No results */}
        {!loading && hasSearched && restaurants.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <UtensilsCrossed className="w-10 h-10 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-medium mb-1">Noch keine Restaurants gefunden</p>
            <p className="text-gray-600 text-sm">Probiere eine andere Stadt oder Küche.</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasSearched && (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <Search className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Gib deine Stadt oder PLZ ein und drücke Suchen</p>
          </div>
        )}

        {/* Vertical stack: Restaurant list + Iframe below */}
        {!loading && restaurants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Restaurant list */}
            <p className="text-xs text-gray-600" style={{ textAlign: 'right' }}>
              {restaurants.length} Restaurant{restaurants.length !== 1 ? 's' : ''}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '10px',
            }}>
              {restaurants.map((r) => (
                <RestaurantListItem
                  key={r.id}
                  restaurant={r}
                  isSelected={selected?.id === r.id}
                  onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  compact={false}
                />
              ))}
            </div>

            {/* Embedded storefront — volle Breite, unter der Liste */}
            {selected?.slug && (
              <div style={{
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(199,161,122,0.25)',
                background: '#0f0f0f',
                marginTop: '4px',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(199,161,122,0.08)',
                  borderBottom: '1px solid rgba(199,161,122,0.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--brand-accent)', fontSize: '14px', fontWeight: 700 }}>
                      {selected.name}
                    </span>
                    {selected.cuisine_type && (
                      <span style={{
                        padding: '2px 10px', borderRadius: '999px',
                        background: 'rgba(199,161,122,0.12)', color: 'var(--brand-accent)',
                        fontSize: '11px', fontWeight: 600,
                      }}>
                        {selected.cuisine_type}
                      </span>
                    )}
                  </div>
                  <button
                    id="close-storefront"
                    onClick={() => setSelected(null)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#6b7280', display: 'flex', alignItems: 'center', padding: '4px',
                    }}
                    title="Schließen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Iframe — volle Höhe */}
                <div style={{ background: '#0f0f0f' }}>
                  <iframe
                    src={getStorefrontUrl(selected.slug)}
                    style={{
                      width: '100%',
                      height: '700px',
                      border: 'none',
                      display: 'block',
                    }}
                    title={`Speisekarte ${selected.name}`}
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────── FOR RESTAURATEURS ─────── */}
      {!showSplitView && (
        <section className="relative z-10 px-4 pb-12 max-w-4xl mx-auto w-full">
          <div style={{
            background: 'rgba(199,161,122,0.05)', border: '1px solid rgba(199,161,122,0.2)',
            borderRadius: '20px', padding: '28px', textAlign: 'center',
          }}>
            <h2 className="text-xl font-bold text-white mb-2">Du bist Gastronom?</h2>
            <p className="text-gray-400 text-sm mb-5 max-w-md mx-auto">
              Starte kostenlos — keine Provision, kein Lock-in. Deine Speisekarte online in 10 Minuten.
            </p>
            {isSuccess ? (
              <div style={{ color: 'var(--brand-accent)', fontWeight: 700 }}>🎉 Danke! Wir melden uns in Kürze.</div>
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
                  className="placeholder:text-gray-500"
                  style={{
                    padding: '11px 18px', borderRadius: '10px', width: '220px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#d1d5db', fontSize: '14px', outline: 'none',
                  }}
                />
                <button
                  id="early-access-submit"
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  style={{
                    padding: '11px 20px', borderRadius: '10px',
                    background: isSubmitting || !email.trim() ? 'rgba(199,161,122,0.4)' : 'var(--brand-accent)',
                    color: '#111', fontSize: '14px', fontWeight: 700,
                    border: 'none', cursor: isSubmitting || !email.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {isSubmitting ? 'Wird eingetragen…' : <>Vorabzugang sichern <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10" style={{
        borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
      }}>
        <p className="text-gray-700 text-xs">© 2026 Bizzn.de – Made for Restaurants.</p>
        <Link href="/auth/login" className="text-gray-500 hover:text-gray-300 transition-colors" style={{ fontSize: '12px', textDecoration: 'underline' }}>
          Gastronomen-Login →
        </Link>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Restaurant List Item (kompakt für Split-View, normal für Grid) ───
function RestaurantListItem({
  restaurant,
  isSelected,
  onClick,
  compact,
}: {
  restaurant: Restaurant
  isSelected: boolean
  onClick: () => void
  compact: boolean
}) {
  return (
    <button
      id={`restaurant-item-${restaurant.id}`}
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: isSelected ? 'rgba(199,161,122,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isSelected ? 'rgba(199,161,122,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'rgba(199,161,122,0.3)'
          e.currentTarget.style.background = 'rgba(199,161,122,0.05)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        }
      }}
    >
      {/* Cover image — nur wenn nicht compact */}
      {!compact && restaurant.cover_image_url && (
        <div style={{ height: '120px', overflow: 'hidden', background: '#1a1a1a' }}>
          <img
            src={restaurant.cover_image_url}
            alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      {!compact && !restaurant.cover_image_url && (
        <div style={{
          height: '80px', background: 'linear-gradient(135deg, rgba(199,161,122,0.1), rgba(199,161,122,0.03))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UtensilsCrossed className="w-7 h-7 text-gray-700" />
        </div>
      )}

      {/* Info row */}
      <div style={{ padding: compact ? '10px 12px' : '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Compact: mini avatar */}
        {compact && (
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden',
            background: restaurant.cover_image_url ? undefined : 'rgba(199,161,122,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {restaurant.cover_image_url
              ? <img src={restaurant.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <UtensilsCrossed className="w-4 h-4 text-gray-600" />
            }
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-white font-semibold" style={{ fontSize: compact ? '13px' : '14px', margin: 0, lineHeight: '1.3' }}>
            {restaurant.name}
          </p>
          {restaurant.cuisine_type && (
            <p className="text-xs" style={{ color: 'var(--brand-accent)', margin: '2px 0 0', opacity: 0.8 }}>
              {restaurant.cuisine_type}
            </p>
          )}
          {(restaurant.postal_code || restaurant.city) && !compact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
              <MapPin className="w-3 h-3 text-gray-600" />
              <span className="text-gray-600" style={{ fontSize: '11px' }}>
                {[restaurant.postal_code, restaurant.city].filter(Boolean).join(' ')}
              </span>
            </div>
          )}
        </div>

        <ChevronRight
          className="w-4 h-4 flex-shrink-0"
          style={{ color: isSelected ? 'var(--brand-accent)' : '#4b5563', transition: 'transform 0.2s', transform: isSelected ? 'rotate(90deg)' : 'none' }}
        />
      </div>
    </button>
  )
}
