'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { checkoutWithAuth, getCustomerSession } from '@/app/actions/checkout'
import { signOutCustomer } from '@/app/actions/customer'
import type { SlotDay } from '@/app/api/slots/[slug]/route'
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronDown, ChevronLeft,
  User, Mail, Lock, Phone, CheckCircle, Loader2, Tag, LogOut, Eye, EyeOff, Clock,
  CreditCard, Banknote
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface CartItem {
  menuItemId: string
  name: string
  priceInCents: number
  quantity: number
}

interface DiscountInfo { enabled: boolean; pct: number }
interface DeliveryInfo { enabled: boolean; feeCents: number; minOrderCents: number; freeAboveCents: number }

interface CustomerSession {
  userId: string | null
  name: string | null
  email: string | null
}

type View = 'menu' | 'cart' | 'checkout' | 'status'
type AuthTab = 'register' | 'login'
type OrderType = 'takeaway' | 'delivery' | 'in-store'
type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

interface Props {
  projectId: string
  projectName?: string
  slug: string
  categories: Category[]
  discountInfo: DiscountInfo
  deliveryInfo: DeliveryInfo
  cartKey: string
  inStoreEnabled?: boolean
  tableNumber?: string | null
  pickupSlotsEnabled?: boolean
  // M25: Online-Zahlung
  stripeEnabled?: boolean
  stripePublishableKey?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const STATUS_LABELS_OUTDOOR: Record<OrderStatus, string> = {
  pending: '🕐 Neu eingegangen',
  preparing: '👨‍🍳 In Vorbereitung',
  ready: '✅ Bereit zur Abholung',
  delivered: '🎉 Abgeholt / Geliefert',
  cancelled: '❌ Storniert',
}

const STATUS_LABELS_TABLE: Record<OrderStatus, string> = {
  pending: '🕐 Neu eingegangen',
  preparing: '👨‍🍳 In Zubereitung',
  ready: '🍽️ Wird serviert',
  delivered: '🎉 Abgeschlossen',
  cancelled: '❌ Storniert',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#6b7280',
  preparing: '#f59e0b',
  ready: '#22c55e',
  delivered: '#C7A17A',
  cancelled: '#ef4444',
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

const S = {
  input: {
    width: '100%',
    padding: '11px 12px 11px 38px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700 as const,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: '6px',
  },
  btn: (variant: 'primary' | 'ghost' | 'danger') => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    fontWeight: 900 as const,
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ...(variant === 'primary' ? {
      background: 'linear-gradient(135deg, #c7a17a, #d4a870)',
      color: '#111',
      boxShadow: '0 4px 20px rgba(199,161,122,0.3)',
    } : variant === 'ghost' ? {
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#9ca3af',
    } : {
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.2)',
      color: '#ef4444',
    }),
  }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InlineMenuBoard({ projectId, slug, categories, discountInfo, deliveryInfo, cartKey, inStoreEnabled = false, tableNumber = null, pickupSlotsEnabled = false, stripeEnabled = false, stripePublishableKey }: Props) {
  const [view, setView] = useState<View>('menu')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => new Set<string>())
  const [cart, setCartRaw] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<OrderType>(tableNumber ? 'in-store' : 'takeaway')
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  // Auth fields
  const [authTab, setAuthTab] = useState<AuthTab>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [deliveryStreet, setDeliveryStreet] = useState('')
  const [deliveryZip, setDeliveryZip] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')

  // M24b: Pickup slots via API
  const [slotDays, setSlotDays] = useState<SlotDay[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)          // index in slotDays
  const [selectedSlot, setSelectedSlot] = useState<string>('') // '' = ASAP

  // M25: Zahlungsart
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [stripeElements, setStripeElements] = useState<import('@stripe/stripe-js').StripeElements | null>(null)
  const [stripeInstance, setStripeInstance] = useState<import('@stripe/stripe-js').Stripe | null>(null)
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const stripeContainerRef = useRef<HTMLDivElement>(null)

  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  // Order status
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending')
  const [orderItems, setOrderItems] = useState<CartItem[]>([])
  const [orderTotal, setOrderTotal] = useState(0)

  // ── Live Status: Realtime + Polling Fallback ──────────────────────────────
  useEffect(() => {
    if (!orderId) return

    const sb = createClient()

    // Fetch current status once immediately
    const fetchStatus = async () => {
      const { data } = await sb
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()
      if (data?.status) setOrderStatus(data.status as OrderStatus)
    }
    void fetchStatus()

    // Supabase Realtime for instant updates
    const channel = sb
      .channel(`order-status-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, payload => {
        const newStatus = (payload.new as { status: OrderStatus }).status
        setOrderStatus(newStatus)
      })
      .subscribe()

    // Polling alle 5s als zuverlässiger Fallback
    const poll = setInterval(fetchStatus, 5_000)

    return () => {
      clearInterval(poll)
      void sb.removeChannel(channel)
    }
  }, [orderId])

  // ── Restore cart & session on mount ──────────────────────────────────────
  useEffect(() => {
    // Zuerst Session prüfen — dann Cart restaurieren oder löschen
    getCustomerSession()
      .then(s => {
        setSession(s)
        if (s.userId) {
          // Eingeloggt: Gespeicherten Cart laden & Formular vorausfüllen
          if (s.name) setName(s.name)
          if (s.email) setEmail(s.email)
          try {
            const saved = localStorage.getItem(cartKey)
            if (saved) {
              const items = JSON.parse(saved) as CartItem[]
              if (items.length > 0) {
                setCartRaw(items)
              }
            }
          } catch { /**/ }
        } else {
          // Nicht eingeloggt: Cart aus localStorage löschen (Logout-Schutz)
          try { localStorage.removeItem(cartKey) } catch { /**/ }
          setCartRaw([])
          setView('menu')
        }
      })
      .catch(() => {
        // Session-Abfrage fehlgeschlagen — Cart trotzdem laden (Offline-Fallback)
        try {
          const saved = localStorage.getItem(cartKey)
          if (saved) {
            const items = JSON.parse(saved) as CartItem[]
            if (items.length > 0) setCartRaw(items)
          }
        } catch { /**/ }
      })


    // M24b: Lade Abholzeit-Slots von der API (nur wenn Feature aktiv)
    if (pickupSlotsEnabled) {
      setSlotsLoading(true)
      fetch(`/api/slots/${slug}`)
        .then(r => {
          if (!r.ok) throw new Error(`Slots API ${r.status}`)
          return r.json()
        })
        .then(json => {
          if (json.days) setSlotDays(json.days)
        })
        .catch(() => { /* Slots laden fehlgeschlagen — kein harter Fehler */ })
        .finally(() => setSlotsLoading(false))
    }
  }, [cartKey, projectId, slug, pickupSlotsEnabled])

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const setCart = (updater: CartItem[] | ((p: CartItem[]) => CartItem[])) => {
    setCartRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem(cartKey, JSON.stringify(next)) } catch { /**/ }
      return next
    })
  }

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItemId === item.id)
      if (ex) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item.id, name: item.name, priceInCents: item.price, quantity: 1 }]
    })
  }

  const changeQty = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0))
  }

  const clearCart = () => {
    setCartRaw([])
    try { localStorage.removeItem(cartKey) } catch { /**/ }
  }

  // ── Pricing ───────────────────────────────────────────────────────────────
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const subtotalCents = cart.reduce((s, i) => s + i.priceInCents * i.quantity, 0)
  const showDiscount = !!(discountInfo.enabled && discountInfo.pct > 0)
  const discountCents = showDiscount ? Math.round(subtotalCents * discountInfo.pct / 100) : 0
  const freeAbove = deliveryInfo.freeAboveCents
  const freeReached = freeAbove > 0 && subtotalCents >= freeAbove
  const deliveryFeeCents = (orderType === 'delivery' && !freeReached) ? (deliveryInfo.feeCents ?? 0) : 0
  const totalCents = subtotalCents - discountCents + deliveryFeeCents

  const minOrderCents = deliveryInfo.minOrderCents ?? 0
  const belowMin = orderType === 'delivery' && minOrderCents > 0 && subtotalCents < minOrderCents

  // ── M25: Stripe lazy-init when card payment selected ─────────────────────
  const mountStripeElements = useCallback(async (clientSecret: string) => {
    if (!stripePublishableKey || !stripeContainerRef.current) return
    const { loadStripe } = await import('@stripe/stripe-js')
    const stripe = await loadStripe(stripePublishableKey)
    if (!stripe || !stripeContainerRef.current) return

    const elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#C7A17A',
          colorBackground: '#1a1a1a',
          colorText: '#f0f0f0',
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '10px',
        },
      },
    })
    const paymentElement = elements.create('payment')
    paymentElement.mount(stripeContainerRef.current)
    setStripeInstance(stripe)
    setStripeElements(elements)
  }, [stripePublishableKey])

  // ── Submit (Cash) ─────────────────────────────────────────────────────────
  const submitOrder = useCallback(async () => {
    const deliveryAddress = orderType === 'delivery'
      ? `${deliveryStreet.trim()}, ${deliveryZip.trim()} ${deliveryCity.trim()}`
      : undefined
    const pickupSlotLabel = selectedSlot || undefined
    const mode = session?.userId ? 'existing' : authTab === 'register' ? 'register' : 'login'

    const result = await checkoutWithAuth({
      mode,
      projectId,
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      items: cart,
      orderType,
      deliveryAddress,
      tableNumber: tableNumber ?? undefined,
      pickupSlot: pickupSlotLabel,
      paymentMode: paymentMethod, // M26: Bar vs. Karte
    })

    return result
  }, [authTab, cart, deliveryCity, deliveryStreet, deliveryZip, email, name, orderType, password, paymentMethod, phone, projectId, selectedSlot, session, tableNumber])

  const handleCheckout = () => {
    setFormError(null)
    if (!name.trim()) { setFormError('Bitte gib deinen Namen ein.'); return }
    if (!email.trim()) { setFormError('Bitte gib deine E-Mail ein.'); return }
    if (!phone.trim()) { setFormError('Bitte gib deine Telefonnummer ein.'); return }
    if (!session?.userId && password.length < 6) { setFormError('Passwort muss mind. 6 Zeichen haben.'); return }
    if (orderType === 'delivery') {
      if (!deliveryStreet.trim() || !deliveryZip.trim() || !deliveryCity.trim()) {
        setFormError('Bitte gib deine vollständige Lieferadresse ein.'); return
      }
      if (belowMin) { setFormError(`Mindestbestellwert: ${eur(minOrderCents)}`); return }
    }

    if (paymentMethod === 'card') {
      // ── Card Flow: Order anlegen → Payment Intent → Stripe confirm
      startTransition(async () => {
        // 1. Bestellung aufgeben
        const result = await submitOrder()
        if (result.error) { setFormError(result.error); return }
        if (!result.orderId) { setFormError('Bestellfehler. Bitte versuche es erneut.'); return }

        const newOrderId = result.orderId
        setOrderId(newOrderId)
        setOrderItems([...cart])
        setOrderTotal(totalCents)

        // 2. Payment Intent erstellen
        setStripeLoading(true)
        const piRes = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, amountCents: totalCents, orderId: newOrderId }),
        })
        setStripeLoading(false)
        const piText = await piRes.text()
        let piJson: { clientSecret?: string; error?: string } = {}
        try { piJson = JSON.parse(piText) } catch {
          setFormError('Stripe-Fehler. Bitte versuche Barzahlung.')
          return
        }

        if (piJson.error || !piJson.clientSecret) {
          setFormError(piJson.error ?? 'Stripe-Fehler. Bitte versuche Barzahlung.')
          return
        }

        setStripeClientSecret(piJson.clientSecret)

        // 3. Stripe Elements mounten (nächster Render, dann confirm)
        await mountStripeElements(piJson.clientSecret)
      })
      return
    }

    // ── Cash Flow ───────────────────────────────────────────────────────────
    startTransition(async () => {
      const result = await submitOrder()
      if (result.error) { setFormError(result.error); return }
      if (result.orderId) {
        setOrderId(result.orderId)
        setOrderItems([...cart])
        setOrderTotal(totalCents)
        clearCart()
        setView('status')
        getCustomerSession().then(setSession)
      }
    })
  }

  // ── Confirm Card Payment ──────────────────────────────────────────────────
  const handleConfirmCardPayment = () => {
    if (!stripeInstance || !stripeElements || !stripeClientSecret) return
    startTransition(async () => {
      setFormError(null)
      const { error } = await stripeInstance.confirmPayment({
        elements: stripeElements,
        confirmParams: {
          return_url: `${window.location.origin}${window.location.pathname}?order_confirmed=1`,
        },
        redirect: 'if_required',
      })
      if (error) {
        setFormError(error.message ?? 'Zahlung fehlgeschlagen. Bitte versuche es erneut.')
        return
      }
      // Payment succeeded without redirect (e.g. Google/Apple Pay)
      clearCart()
      setView('status')
      getCustomerSession().then(setSession)
    })
  }

  const handleQuickCheckout = () => {
    setFormError(null)
    startTransition(async () => {
      const result = await checkoutWithAuth({
        mode: session?.userId ? 'existing' : 'anonymous',
        projectId,
        items: cart,
        orderType: 'in-store',
        tableNumber: tableNumber ?? undefined,
        paymentMode: 'cash', // In-Store ist immer Barzahlung
      })

      if (result.error) {
        setFormError(result.error)
        return
      }

      if (result.orderId) {
        setOrderId(result.orderId)
        setOrderItems([...cart])
        setOrderTotal(totalCents)
        clearCart()
        setView('status')
        if (session?.userId) {
          getCustomerSession().then(setSession)
        }
      }
    })
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const InputField = ({
    id, label, type = 'text', value, onChange, placeholder, icon: Icon, required,
    suffix
  }: {
    id: string; label: string; type?: string; value: string
    onChange: (v: string) => void; placeholder: string; icon: React.ElementType
    required?: boolean; suffix?: React.ReactNode
  }) => (
    <div>
      <label htmlFor={id} style={S.label}>{label}{required && ' *'}</label>
      <div style={{ position: 'relative' }}>
        <Icon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563', pointerEvents: 'none' }} />
        <input
          id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={S.input}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        {suffix && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>{suffix}</div>}
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: MENU
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'menu') return (
    <div style={{ background: '#0d0d0d', minHeight: '100%' }}>
      {/* Category List */}
      <div style={{ padding: '16px', paddingBottom: '120px' }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <p>Speisekarte wird vorbereitet…</p>
          </div>
        ) : categories.map(cat => {
          const isCollapsed = collapsedCats.has(cat.id)
          const activeItems = cat.menu_items.filter(i => i.is_active)
          if (activeItems.length === 0) return null
          return (
            <section key={cat.id} style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setCollapsedCats(prev => { const n = new Set(prev); if (n.has(cat.id)) { n.delete(cat.id) } else { n.add(cat.id) } return n })}
                style={{ width: '100%', background: 'none', border: 'none', padding: '0', cursor: 'pointer', marginBottom: '12px' }}
              >
                <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f0f0f0', fontSize: '17px', fontWeight: 900, margin: 0, padding: '0 0 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {cat.name}
                  <ChevronDown style={{ width: '18px', height: '18px', color: '#C7A17A', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </h2>
              </button>

              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeItems.map(item => {
                    const inCart = cart.find(c => c.menuItemId === item.id)
                    return (
                      <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{item.name}</p>
                            {item.description && <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 4px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}
                            <p style={{ color: '#C7A17A', fontWeight: 800, fontSize: '14px', margin: 0 }}>{eur(item.price)}</p>
                          </div>

                          {item.image_url && (
                            <button onClick={() => setLightbox({ src: item.image_url!, alt: item.name })} style={{ border: 'none', background: 'none', padding: 0, cursor: 'zoom-in', flexShrink: 0 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.image_url} alt={item.name} style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover' }} />
                            </button>
                          )}

                          <div style={{ flexShrink: 0 }}>
                            {inCart ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => changeQty(item.id, -1)} style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus style={{ width: '13px', height: '13px' }} /></button>
                                <span style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '14px', minWidth: '16px', textAlign: 'center' }}>{inCart.quantity}</span>
                                <button onClick={() => changeQty(item.id, 1)} style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#C7A17A', border: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus style={{ width: '13px', height: '13px' }} /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(item)} style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(199,161,122,0.15)', border: '1px solid rgba(199,161,122,0.2)', cursor: 'pointer', color: '#C7A17A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Plus style={{ width: '16px', height: '16px' }} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Sticky Cart Button */}
      {totalItems > 0 && (
        <div style={{ position: 'sticky', bottom: 0, padding: '16px', background: 'linear-gradient(to top, #0d0d0d 80%, transparent)', zIndex: 10 }}>
          <button
            onClick={() => setView('cart')}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #c7a17a, #d4a870)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(199,161,122,0.4)' }}
          >
            <span style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '4px 10px', color: '#111', fontWeight: 900, fontSize: '14px' }}>{totalItems}</span>
            <span style={{ color: '#111', fontWeight: 900, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}><ShoppingCart style={{ width: '18px', height: '18px' }} /> Warenkorb ansehen</span>
            <span style={{ color: '#111', fontWeight: 900, fontSize: '14px' }}>{eur(totalCents)}</span>
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.src} alt={lightbox.alt} onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: CART
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'cart') return (
    <div style={{ background: '#0d0d0d', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

        {/* Back to menu */}
        <button onClick={() => setView('menu')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#C7A17A', fontWeight: 700, fontSize: '13px', padding: '0', marginBottom: '20px' }}>
          <ChevronLeft style={{ width: '16px', height: '16px' }} /> Weiter stöbern
        </button>

        <h2 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '20px', margin: '0 0 20px' }}>🛒 Deine Bestellung</h2>

        {/* Cart Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {cart.map(item => (
            <div key={item.menuItemId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{item.name}</p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>{item.quantity} × {eur(item.priceInCents)}</p>
              </div>
              <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '14px', margin: 0 }}>{eur(item.priceInCents * item.quantity)}</p>
              <button onClick={() => changeQty(item.menuItemId, -item.quantity)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#6b7280', display: 'flex' }}>
                <Trash2 style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          ))}
        </div>

        {/* Discount Banner */}
        {showDiscount && subtotalCents > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: '16px' }}>
            <Tag style={{ width: '16px', height: '16px', color: '#fbbf24', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fbbf24', fontWeight: 800, fontSize: '12px', margin: '0 0 2px' }}>🎉 {discountInfo.pct}% Willkommensrabatt!</p>
              <p style={{ color: '#d97706', fontSize: '11px', margin: 0 }}>Wird automatisch bei deiner ersten Bestellung abgezogen.</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: '#6b7280', fontSize: '11px', margin: '0', textDecoration: 'line-through' }}>{eur(subtotalCents)}</p>
              <p style={{ color: '#fbbf24', fontWeight: 800, fontSize: '13px', margin: 0 }}>-{eur(discountCents)}</p>
            </div>
          </div>
        )}

        {/* Totals */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>
            <span>Zwischensumme</span><span>{eur(subtotalCents)}</span>
          </div>
          {showDiscount && subtotalCents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
              <span>Rabatt ({discountInfo.pct}%)</span><span>-{eur(discountCents)}</span>
            </div>
          )}
          {orderType === 'delivery' && deliveryFeeCents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '4px' }}>
              <span>🛵 Liefergebühr</span><span>{eur(deliveryFeeCents)}</span>
            </div>
          )}
          {orderType === 'delivery' && freeReached && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
              <span>🎁 Gratislieferung</span><span>0,00 €</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f0f0f0', fontWeight: 900, fontSize: '18px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '8px' }}>
            <span>Gesamt</span><span style={{ color: '#C7A17A' }}>{eur(totalCents)}</span>
          </div>
        </div>

        {/* Order Type */}
        {!tableNumber && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ ...S.label, marginBottom: '10px' }}>Bestellart</p>
            <div style={{ display: 'grid', gridTemplateColumns: inStoreEnabled ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px' }}>
              {(['takeaway', 'delivery', ...(inStoreEnabled ? ['in-store' as const] : [])] as OrderType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  style={{
                    padding: '10px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: orderType === type ? 'rgba(199,161,122,0.15)' : 'rgba(255,255,255,0.03)',
                    borderColor: orderType === type ? 'rgba(199,161,122,0.5)' : 'rgba(255,255,255,0.07)',
                    color: orderType === type ? '#C7A17A' : '#9ca3af',
                  }}
                >
                  {type === 'takeaway' ? '🛍️ Abholung' : type === 'delivery' ? '🛵 Lieferung' : '🪑 Vor Ort'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table banner — shown when in-store + tableNumber is set */}
        {orderType === 'in-store' && tableNumber && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', marginBottom: '16px',
            background: 'rgba(199,161,122,0.1)',
            border: '1.5px solid rgba(199,161,122,0.35)',
            borderRadius: '12px',
          }}>
            <span style={{ fontSize: '24px' }}>🪑</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#C7A17A', fontWeight: 900, fontSize: '16px', margin: '0 0 2px' }}>Tisch {tableNumber}</p>
              <p style={{ color: 'rgba(199,161,122,0.6)', fontSize: '11px', margin: 0 }}>Deine Bestellung wird direkt an den Tisch gebracht.</p>
            </div>
          </div>
        )}

        {belowMin && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '12px', marginBottom: '16px' }}>
            Mindestbestellwert für Lieferung: {eur(minOrderCents)} — noch {eur(minOrderCents - subtotalCents)} fehlen
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0d0d0d', flexShrink: 0 }}>
        {formError && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
            {formError}
          </div>
        )}
        
        {tableNumber ? (
          <button
            onClick={handleQuickCheckout}
            disabled={cart.length === 0 || isPending}
            style={{ ...S.btn('primary'), opacity: (cart.length === 0 || isPending) ? 0.5 : 1 }}
          >
            {isPending
              ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} /> Wird verarbeitet…</>
              : <><ShoppingCart style={{ width: '18px', height: '18px' }} /> Jetzt bestellen · {eur(totalCents)}</>
            }
          </button>
        ) : (
          <button
            onClick={() => setView('checkout')}
            disabled={cart.length === 0 || belowMin}
            style={{ ...S.btn('primary'), opacity: (cart.length === 0 || belowMin) ? 0.5 : 1 }}
          >
            Weiter zur Kasse →
          </button>
        )}
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: CHECKOUT (Review + Auth)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'checkout') return (
    <div style={{ background: '#0d0d0d', minHeight: '100%' }}>
      <div style={{ padding: '20px', paddingBottom: '32px' }}>

        <button onClick={() => { setView('cart'); setFormError(null) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#C7A17A', fontWeight: 700, fontSize: '13px', padding: '0', marginBottom: '20px' }}>
          <ChevronLeft style={{ width: '16px', height: '16px' }} /> Zurück zum Warenkorb
        </button>

        <h2 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '20px', margin: '0 0 6px' }}>Deine Angaben</h2>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 24px' }}>
          {session?.userId ? `Angemeldet als ${session.email}` : 'Erstelle ein Konto oder melde dich an'}
        </p>

        {/* Auth Tabs (nur wenn nicht eingeloggt) */}
        {!session?.userId && (
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '20px' }}>
            {(['register', 'login'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setAuthTab(t); setFormError(null) }}
                style={{
                  flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: authTab === t ? '#C7A17A' : '#6b7280',
                  borderBottom: authTab === t ? '2px solid #C7A17A' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'register' ? 'Neues Konto' : 'Bereits Konto?'}
              </button>
            ))}
          </div>
        )}

        {/* Logout option */}
        {session?.userId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(199,161,122,0.06)', border: '1px solid rgba(199,161,122,0.12)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(199,161,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User style={{ width: '16px', height: '16px', color: '#C7A17A' }} />
              </div>
              <div>
                <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '13px', margin: 0 }}>{session.name || session.email?.split('@')[0]}</p>
                <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>{session.email}</p>
              </div>
            </div>
            <button onClick={async () => { await signOutCustomer(); setSession(null); clearCart() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
              <LogOut style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Name */}
          {(authTab === 'register' || session?.userId) && (
            <InputField id="checkout-name" label="Name" value={name} onChange={setName} placeholder="Dein Name" icon={User} required />
          )}

          {/* E-Mail */}
          <InputField id="checkout-email" label="E-Mail" type="email" value={email} onChange={setEmail} placeholder="du@beispiel.de" icon={Mail} required />

          {/* Telefon */}
          {(authTab === 'register' || session?.userId) && (
            <InputField id="checkout-phone" label="Telefon" type="tel" value={phone} onChange={setPhone} placeholder="+49 171 1234567" icon={Phone} required />
          )}

          {/* Passwort (nur wenn nicht eingeloggt) */}
          {!session?.userId && (
            <InputField
              id="checkout-password"
              label="Passwort"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder={authTab === 'register' ? 'Mind. 6 Zeichen' : '••••••••'}
              icon={Lock}
              required
              suffix={
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: '2px' }}>
                  {showPassword ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                </button>
              }
            />
          )}

          {/* M24b: Abholzeit-Picker */}
          {pickupSlotsEnabled && orderType !== 'in-store' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0' }}>
                <Clock style={{ width: '13px', height: '13px', color: '#C7A17A' }} />
                Abholzeit wählen
              </p>

              {slotsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '12px' }}>
                  <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 0.8s linear infinite' }} />
                  Lade Zeitslots…
                </div>
              ) : slotDays.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '12px' }}>Keine Öffnungszeiten konfiguriert.</p>
              ) : (
                <>
                  {/* ⚡ ASAP Chip */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { setSelectedSlot(''); setSelectedDay(0) }}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        border: selectedSlot === '' ? '1.5px solid #C7A17A' : '1.5px solid rgba(255,255,255,0.12)',
                        background: selectedSlot === '' ? 'rgba(199,161,122,0.15)' : 'transparent',
                        color: selectedSlot === '' ? '#C7A17A' : '#9ca3af',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      ⚡ So schnell wie möglich
                    </button>
                  </div>

                  {/* Tag-Tabs */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {slotDays.filter(d => d.open).map((day, i) => (
                      <button
                        key={day.date}
                        onClick={() => { setSelectedDay(i); setSelectedSlot('') }}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                          border: selectedDay === i && selectedSlot !== '' ? '1.5px solid #C7A17A' : '1.5px solid rgba(255,255,255,0.1)',
                          background: selectedDay === i && selectedSlot !== '' ? 'rgba(199,161,122,0.12)' : 'rgba(255,255,255,0.04)',
                          color: selectedDay === i && selectedSlot !== '' ? '#C7A17A' : '#9ca3af',
                          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                        }}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>

                  {/* Zeit-Chips (horizontal scroll) */}
                  {slotDays.filter(d => d.open)[selectedDay] && (
                    <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
                        {slotDays.filter(d => d.open)[selectedDay].slots.map(slot => {
                          const isSelected = selectedSlot === slot.value
                          return (
                            <button
                              key={slot.value}
                              disabled={slot.full}
                              onClick={() => !slot.full && setSelectedSlot(isSelected ? '' : slot.value)}
                              style={{
                                padding: '7px 13px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                border: isSelected
                                  ? '1.5px solid #C7A17A'
                                  : slot.full
                                  ? '1.5px solid rgba(255,255,255,0.05)'
                                  : '1.5px solid rgba(255,255,255,0.12)',
                                background: isSelected
                                  ? 'rgba(199,161,122,0.18)'
                                  : slot.full
                                  ? 'rgba(255,255,255,0.02)'
                                  : 'rgba(255,255,255,0.05)',
                                color: isSelected ? '#C7A17A' : slot.full ? 'rgba(255,255,255,0.15)' : '#e5e7eb',
                                cursor: slot.full ? 'not-allowed' : 'pointer',
                                textDecoration: slot.full ? 'line-through' : 'none',
                                flexShrink: 0,
                                transition: 'all 0.12s',
                              }}
                            >
                              {slot.time}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedSlot && (
                    <p style={{ fontSize: '11px', color: '#C7A17A', fontWeight: 600, margin: 0 }}>
                      ✓ Abholzeit: {selectedSlot}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Lieferadresse */}
          {orderType === 'delivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ ...S.label, marginBottom: '0' }}>📍 Lieferadresse</p>
              <div style={{ position: 'relative' }}>
                <input value={deliveryStreet} onChange={e => setDeliveryStreet(e.target.value)} placeholder="Straße und Hausnummer *" style={{ ...S.input, paddingLeft: '12px' }} onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '8px' }}>
                <input value={deliveryZip} onChange={e => setDeliveryZip(e.target.value)} placeholder="PLZ *" maxLength={5} style={{ ...S.input, paddingLeft: '12px' }} onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                <input value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} placeholder="Stadt *" style={{ ...S.input, paddingLeft: '12px' }} onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
            </div>
          )}

          {/* Bestellübersicht */}
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(199,161,122,0.04)', border: '1px solid rgba(199,161,122,0.1)' }}>
            <p style={{ ...S.label, marginBottom: '10px', color: '#C7A17A' }}>Deine Bestellung</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {cart.map(item => (
                <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#9ca3af' }}>{item.quantity}× {item.name}</span>
                  <span style={{ color: '#f0f0f0', fontWeight: 700 }}>{eur(item.priceInCents * item.quantity)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '4px' }}>
                <span style={{ color: '#C7A17A', fontWeight: 900, fontSize: '14px' }}>Gesamt</span>
                <span style={{ color: '#C7A17A', fontWeight: 900, fontSize: '14px' }}>{eur(totalCents)}</span>
              </div>
            </div>
          </div>

          {/* M25: Zahlungsart */}
          {stripeEnabled && orderType !== 'in-store' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ ...S.label, marginBottom: '0' }}>💳 Zahlungsart</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: paymentMethod === 'cash' ? 'rgba(199,161,122,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${paymentMethod === 'cash' ? 'rgba(199,161,122,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    color: paymentMethod === 'cash' ? '#C7A17A' : '#9ca3af',
                  }}
                >
                  <Banknote style={{ width: '16px', height: '16px' }} /> Bar zahlen
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: paymentMethod === 'card' ? 'rgba(99,91,255,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${paymentMethod === 'card' ? 'rgba(99,91,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    color: paymentMethod === 'card' ? '#a78bfa' : '#9ca3af',
                  }}
                >
                  <CreditCard style={{ width: '16px', height: '16px' }} /> Karte / Apple Pay
                </button>
              </div>
            </div>
          )}

          {/* Stripe Elements Container (erscheint nach Bestellung + PI erstellt) */}
          {stripeClientSecret && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ ...S.label, marginBottom: '0', color: '#a78bfa' }}>🔒 Sichere Zahlung</p>
              <div ref={stripeContainerRef} id="stripe-payment-element" style={{ minHeight: '120px' }} />
              {stripeLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '12px' }}>
                  <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 0.8s linear infinite' }} />
                  Lade Zahlungsformular…
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {formError && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px' }}>
              {formError}
            </div>
          )}

          {/* Submit */}
          {stripeClientSecret ? (
            <button
              onClick={handleConfirmCardPayment}
              disabled={isPending || !stripeElements}
              style={{ ...S.btn('primary'), opacity: (isPending || !stripeElements) ? 0.7 : 1, marginTop: '8px',
                background: 'linear-gradient(135deg, #635bff, #7c6fff)',
                boxShadow: '0 4px 20px rgba(99,91,255,0.4)',
              }}
            >
              {isPending
                ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} /> Zahlung wird verarbeitet…</>
                : <><CreditCard style={{ width: '18px', height: '18px' }} /> Jetzt bezahlen · {eur(totalCents)}</>
              }
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isPending}
              style={{ ...S.btn('primary'), opacity: isPending ? 0.7 : 1, marginTop: '8px' }}
            >
              {isPending
                ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} /> Wird verarbeitet…</>
                : paymentMethod === 'card'
                  ? <><CreditCard style={{ width: '18px', height: '18px' }} /> Weiter zur Zahlung · {eur(totalCents)}</>
                  : <><ShoppingCart style={{ width: '18px', height: '18px' }} /> Jetzt bestellen · {eur(totalCents)}</>
              }
            </button>
          )}

          {!session?.userId && authTab === 'register' && (
            <p style={{ fontSize: '10px', color: '#374151', textAlign: 'center', lineHeight: '1.6', margin: 0 }}>
              Mit der Bestellung akzeptierst du die{' '}
              <a href="/agb" target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'underline' }}>AGB</a>{' '}und{' '}
              <a href="/datenschutz" target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'underline' }}>Datenschutzerklärung</a>.
            </p>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: STATUS
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: '#0d0d0d', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px' }}>

      {/* Success Icon */}
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
        <CheckCircle style={{ width: '36px', height: '36px', color: '#22c55e' }} />
      </div>

      <h2 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '22px', margin: '0 0 4px', textAlign: 'center' }}>Bestellung aufgegeben! 🎉</h2>
      <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '32px', textAlign: 'center' }}>Du bekommst eine Bestätigung per E-Mail.</p>

      {/* Order ID */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Bestellnummer</p>
        <p style={{ color: '#C7A17A', fontWeight: 900, fontSize: '16px', fontFamily: 'monospace', margin: 0 }}>#{orderId?.slice(0, 8).toUpperCase()}</p>
      </div>

        {/* Live Status */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', width: '100%', maxWidth: '400px' }}>
        <p style={{ ...S.label, marginBottom: '12px' }}>Live-Status</p>
        {(['pending', 'preparing', 'ready', 'delivered'] as const)
          .filter(s => !(orderType === 'in-store' && s === 'delivered'))
          .map((s, i, arr) => {
          const statuses = ['pending', 'preparing', 'ready', 'delivered']
          const currentIdx = statuses.indexOf(orderStatus)
          const actualIdx = statuses.indexOf(s)
          const isDone = actualIdx <= currentIdx
          const isCurrent = s === orderStatus || (orderType === 'in-store' && s === 'ready' && orderStatus === 'delivered')
          const labels = orderType === 'in-store' ? STATUS_LABELS_TABLE : STATUS_LABELS_OUTDOOR
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < arr.length - 1 ? '12px' : '0' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${isDone ? STATUS_COLORS[s] : 'rgba(255,255,255,0.1)'}`, background: isDone ? `${STATUS_COLORS[s]}20` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.5s, background-color 0.5s' }}>
                {isDone && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[s] }} />}
              </div>
              <span style={{ color: isCurrent ? '#f0f0f0' : isDone ? '#9ca3af' : '#374151', fontWeight: isCurrent ? 800 : 500, fontSize: '14px', animation: isCurrent ? 'pulse 2s ease-in-out infinite' : 'none', willChange: isCurrent ? 'opacity' : 'auto' }}>
                {labels[s]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Order Summary */}
      <div style={{ background: 'rgba(199,161,122,0.04)', border: '1px solid rgba(199,161,122,0.1)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', width: '100%', maxWidth: '400px' }}>
        <p style={{ ...S.label, color: '#C7A17A', marginBottom: '12px' }}>Übersicht</p>
        {orderItems.map(item => (
          <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#9ca3af' }}>{item.quantity}× {item.name}</span>
            <span style={{ color: '#f0f0f0', fontWeight: 700 }}>{eur(item.priceInCents * item.quantity)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '6px' }}>
          <span style={{ color: '#C7A17A', fontWeight: 900 }}>Gesamt</span>
          <span style={{ color: '#C7A17A', fontWeight: 900 }}>{eur(orderTotal)}</span>
        </div>
      </div>

      <button onClick={() => { setView('menu'); setOrderId(null); setOrderStatus('pending') }} style={{ ...S.btn('ghost'), maxWidth: '400px' }}>
        Zurück zur Speisekarte
      </button>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  )
}
