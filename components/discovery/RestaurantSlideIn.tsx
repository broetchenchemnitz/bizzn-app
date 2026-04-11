'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Store } from 'lucide-react'
import InlineMenuBoard from '@/components/storefront/InlineMenuBoard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  image_url: string | null
}

interface Category {
  id: string
  name: string
  menu_items: MenuItem[]
}

interface ProjectData {
  id: string
  name: string
  slug: string
  discountInfo: { enabled: boolean; pct: number }
  deliveryInfo: { enabled: boolean; feeCents: number; minOrderCents: number; freeAboveCents: number }
  inStoreEnabled: boolean
  pickupSlotsEnabled: boolean
  stripeEnabled: boolean
}

interface MenuData {
  project: ProjectData
  categories: Category[]
}

interface Props {
  slug: string
  restaurantName: string
  cuisineType?: string | null
  dealBadge?: string | null
  onClose: () => void
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function MenuSkeleton() {
  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .bizzn-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 10px;
        }
      `}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ marginBottom: '28px' }}>
          <div className="bizzn-shimmer" style={{ height: '20px', width: '30%', marginBottom: '14px' }} />
          {[1, 2].map(j => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ flex: 1 }}>
                <div className="bizzn-shimmer" style={{ height: '14px', width: '60%', marginBottom: '8px' }} />
                <div className="bizzn-shimmer" style={{ height: '11px', width: '85%', marginBottom: '8px' }} />
                <div className="bizzn-shimmer" style={{ height: '14px', width: '20%' }} />
              </div>
              <div className="bizzn-shimmer" style={{ width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RestaurantSlideIn({ slug, restaurantName, cuisineType, dealBadge, onClose }: Props) {
  const [data, setData] = useState<MenuData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Animate in & fetch data
  useEffect(() => {
    setData(null)
    setError(null)

    // Stagger: animate in first, then fetch
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true))
    })

    fetch(`/api/menu/${slug}`)
      .then(r => r.json())
      .then((json: MenuData | { error: string }) => {
        if ('error' in json) { setError(json.error); return }
        setData(json)
      })
      .catch(() => setError('Verbindung fehlgeschlagen.'))
  }, [slug])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 340)
  }

  // ── Panel width: responsive ────────────────────────────────────────────────
  // Mobile (<640px): 100vw
  // Tablet/Desktop (≥640px): min(640px, 100vw) = max 640px, slide over Discovery

  return (
    <>
      {/* ─── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        role="button"
        aria-label="Schließen"
        tabIndex={0}
        onClick={handleClose}
        onKeyDown={e => e.key === 'Enter' && handleClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.32s ease',
          cursor: 'default',
        }}
      />

      {/* ─── Slide-In Panel ───────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${restaurantName} Speisekarte`}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          zIndex: 201,
          width: 'min(100vw, 640px)',
          background: '#0d0d0d',
          display: 'flex',
          flexDirection: 'column',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* ── Panel Header ──────────────────────────────────────────────────── */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          background: 'rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(199,161,122,0.1)',
          flexShrink: 0,
          zIndex: 1,
        }}>
          {/* Back button */}
          <button
            onClick={handleClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '13px', fontWeight: 600,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#f0f0f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#9ca3af' }}
          >
            <ArrowLeft style={{ width: '15px', height: '15px' }} />
            Zurück
          </button>

          {/* Restaurant Name + Tags */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Store style={{ width: '14px', height: '14px', color: '#C7A17A', flexShrink: 0 }} />
            <span style={{
              color: '#C7A17A',
              fontSize: '14px', fontWeight: 900,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '180px',
            }}>
              {restaurantName}
            </span>
            {cuisineType && (
              <span style={{
                padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                background: 'rgba(199,161,122,0.1)', color: '#C7A17A',
                flexShrink: 0,
              }}>
                {cuisineType}
              </span>
            )}
            {dealBadge && (
              <span style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.2)',
                flexShrink: 0,
              }}>
                ⚡ {dealBadge}
              </span>
            )}
          </div>
        </header>

        {/* ── Content Area ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain' }}>
          {error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>😔</div>
              <p style={{ color: '#9ca3af', fontSize: '15px', marginBottom: '20px' }}>{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  fetch(`/api/menu/${slug}`)
                    .then(r => r.json())
                    .then((json: MenuData | { error: string }) => {
                      if ('error' in json) { setError(json.error); return }
                      setData(json)
                    })
                    .catch(() => setError('Verbindung fehlgeschlagen.'))
                }}
                style={{
                  padding: '12px 28px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #c7a17a, #d4a870)',
                  color: '#111', fontWeight: 800, fontSize: '14px',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Nochmal versuchen
              </button>
            </div>
          ) : !data ? (
            <MenuSkeleton />
          ) : (
            <InlineMenuBoard
              projectId={data.project.id}
              slug={data.project.slug}
              projectName={data.project.name}
              categories={data.categories}
              discountInfo={data.project.discountInfo}
              deliveryInfo={data.project.deliveryInfo}
              inStoreEnabled={data.project.inStoreEnabled}
              pickupSlotsEnabled={data.project.pickupSlotsEnabled}
              cartKey={`bizzn-cart-${data.project.id}`}
              stripeEnabled={data.project.stripeEnabled}
              stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
            />
          )}
        </div>
      </div>
    </>
  )
}
