'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { checkoutWithAuth, getCustomerSession, getPaymentRestrictions } from '@/app/actions/checkout'
import { signOutCustomer, signUpCustomer, signInCustomer } from '@/app/actions/customer'
import { validatePhoneNumber } from '@/lib/validation'
import type { SlotDay } from '@/app/api/slots/[slug]/route'
import { DriveInArrivalCard } from '@/components/DriveInArrivalCard'
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronDown, ChevronLeft,
  User, Mail, Lock, Phone, CheckCircle, Loader2, Tag, LogOut, Eye, EyeOff, Clock,
  CreditCard, Banknote
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

// M28: Optionsgruppen-Typen
interface MenuOptionItem {
  id: string
  name: string
  price_cents: number
  is_default: boolean
  sort_order: number
}

interface MenuOptionGroup {
  id: string
  name: string
  is_required: boolean
  min_select: number
  max_select: number
  sort_order: number
  menu_options: MenuOptionItem[]
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  image_url: string | null
  menu_option_groups?: MenuOptionGroup[]
  // Allergene, Zusatzstoffe, Labels, Nährwerte
  allergens?: string[]
  additives?: string[]
  labels?: string[]
  nutritional_info?: Record<string, number> | null
}

interface Category {
  id: string
  name: string
  menu_items: MenuItem[]
}

interface SelectedOption {
  optionId: string
  optionName: string
  groupName: string
  priceCents: number
}

interface CartItem {
  cartEntryId: string
  menuItemId: string
  name: string
  priceInCents: number
  quantity: number
  selectedOptions: SelectedOption[]
  optionsSurcharge: number
  customerNote?: string
}

interface DiscountInfo { enabled: boolean; pct: number }
interface DeliveryInfo { enabled: boolean; feeCents: number; minOrderCents: number; freeAboveCents: number }

interface CustomerSession {
  userId: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

type View = 'menu' | 'cart' | 'auth' | 'checkout' | 'status'
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
  pickupEnabled?: boolean
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

// M28: Migrate old cart items from localStorage (pre-M28 format → new format)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateCartItem(item: any): CartItem {
  return {
    cartEntryId: item.cartEntryId || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36)),
    menuItemId: item.menuItemId,
    name: item.name,
    priceInCents: item.priceInCents,
    quantity: item.quantity,
    selectedOptions: item.selectedOptions ?? [],
    optionsSurcharge: item.optionsSurcharge ?? 0,
    customerNote: item.customerNote,
  }
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

// ─── InputField (must be top-level to avoid remount on each keystroke) ─────────

function InputField({
  id, label, type = 'text', value, onChange, placeholder, icon: Icon, required, suffix
}: {
  id: string; label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder: string; icon: React.ElementType
  required?: boolean; suffix?: React.ReactNode
}) {
  return (
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InlineMenuBoard({ projectId, slug, categories, discountInfo, deliveryInfo, cartKey, pickupEnabled = true, inStoreEnabled = false, tableNumber = null, pickupSlotsEnabled = false, stripeEnabled = false, stripePublishableKey }: Props) {
  const [view, setView] = useState<View>('menu')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => new Set<string>())
  const [cart, setCartRaw] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<OrderType>(tableNumber ? 'in-store' : 'takeaway')
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  // Auth fields
  const [authTab, setAuthTab] = useState<AuthTab>('register')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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

  // Barzahlung-Limit
  const [payRestrictions, setPayRestrictions] = useState<{
    isFirstOrder: boolean
    isBlacklisted: boolean
    blacklistReason: string | null
    cashLimitCents: number
    isBanned: boolean
    banReason: string | null
  } | null>(null)

  // M23: Loyalty-Guthaben
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    balanceCents: number
    orderCount: number
    willRedeem: boolean
    redeemCents: number
  } | null>(null)

  const [isPending, startTransition] = useTransition()
  const [authPending, setAuthPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Order status
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending')
  const [orderItems, setOrderItems] = useState<CartItem[]>([])
  const [orderTotal, setOrderTotal] = useState(0)

  // M27b: Drive-In Status
  const [driveIn, setDriveIn] = useState<{
    eligible: boolean
    arrived: boolean
    plate: string | null
  } | null>(null)

  // M28: Options Drawer
  const [drawerItem, setDrawerItem] = useState<MenuItem | null>(null)
  const [drawerSelections, setDrawerSelections] = useState<Map<string, Set<string>>>(new Map())
  const [drawerQty, setDrawerQty] = useState(1)
  const [drawerNote, setDrawerNote] = useState('')

  // Detail-Modal (Produktinfo: Bild, Beschreibung, Allergene)
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null)

  // Allergen-Ausschlussfilter + Label-Einschlussfilter
  const [excludedAllergens, setExcludedAllergens] = useState<Set<string>>(new Set())
  const [requiredLabel, setRequiredLabel] = useState<string | null>(null)
  const [showFilterBar, setShowFilterBar] = useState(false)

  // Allergen/Label Kataloge (inline, da wir keine Node-Importe im Client nutzen können ohne barrel)
  const ALLERGEN_DEFS: { code: string; label: string; emoji: string }[] = [
    { code: 'gluten', label: 'Gluten', emoji: '🌾' },
    { code: 'crustaceans', label: 'Krebstiere', emoji: '🦐' },
    { code: 'eggs', label: 'Eier', emoji: '🥚' },
    { code: 'fish', label: 'Fisch', emoji: '🐟' },
    { code: 'peanuts', label: 'Erdnüsse', emoji: '🥜' },
    { code: 'soy', label: 'Soja', emoji: '🫝' },
    { code: 'milk', label: 'Milch', emoji: '🥛' },
    { code: 'nuts', label: 'Schalenfr.', emoji: '🌰' },
    { code: 'celery', label: 'Sellerie', emoji: '🥬' },
    { code: 'mustard', label: 'Senf', emoji: '🟡' },
    { code: 'sesame', label: 'Sesam', emoji: '⚪' },
    { code: 'sulfites', label: 'Sulfite', emoji: '🍷' },
    { code: 'lupins', label: 'Lupinen', emoji: '🌿' },
    { code: 'mollusks', label: 'Weichtiere', emoji: '🦪' },
  ]
  const LABEL_DEFS: { code: string; label: string; emoji: string; color: string }[] = [
    { code: 'vegan', label: 'Vegan', emoji: '🌱', color: '#16a34a' },
    { code: 'vegetarian', label: 'Vegetarisch', emoji: '🥬', color: '#22c55e' },
    { code: 'spicy', label: 'Scharf', emoji: '🌶️', color: '#ef4444' },
    { code: 'halal', label: 'Halal', emoji: '☪️', color: '#3b82f6' },
    { code: 'organic', label: 'Bio', emoji: '🌿', color: '#65a30d' },
    { code: 'gluten_free', label: 'Glutenfrei', emoji: '🚫', color: '#d97706' },
    { code: 'lactose_free', label: 'Laktosefrei', emoji: '🚫', color: '#0891b2' },
    { code: 'new', label: 'Neu', emoji: '✨', color: '#a855f7' },
    { code: 'popular', label: 'Beliebt', emoji: '⭐', color: '#f59e0b' },
    { code: 'homemade', label: 'Hausgemacht', emoji: '👨‍🍳', color: '#C7A17A' },
  ]

  // Filter-Logik: Item sichtbar wenn keines der ausgeschlossenen Allergene enthalten UND (kein Label-Filter ODER Label vorhanden)
  const isItemVisible = (item: MenuItem): boolean => {
    if (excludedAllergens.size > 0 && item.allergens?.length) {
      for (const a of item.allergens) {
        if (excludedAllergens.has(a)) return false
      }
    }
    if (requiredLabel && !(item.labels ?? []).includes(requiredLabel)) return false
    return true
  }

  const hasAnyAllergenData = categories.some(c => c.menu_items.some(i => (i.allergens?.length ?? 0) > 0 || (i.labels?.length ?? 0) > 0))

  // ── M27b: Drive-In Status laden ───────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return
    fetch(`/api/drive-in/status?orderId=${orderId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDriveIn(d) })
      .catch(() => {})
  }, [orderId])

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
          getPaymentRestrictions(projectId).then(r => {
            setPayRestrictions(r)
            // Gebannter Kunde → sofort ausloggen
            if (r.isBanned) {
              signOutCustomer().then(() => {
                setSession({ userId: null, name: null, firstName: null, lastName: null, email: null, phone: null })
                setFormError(`🚫 Dein Konto ist bei diesem Restaurant gesperrt.${r.banReason ? ` Grund: ${r.banReason}` : ''} Bitte kontaktiere das Restaurant.`)
              })
              return
            }
          }).catch(() => {})
          if (s.firstName) setFirstName(s.firstName)
          if (s.lastName) setLastName(s.lastName)
          if (s.email) setEmail(s.email)
          if (s.phone) setPhone(s.phone)
          try {
            const saved = localStorage.getItem(cartKey)
            if (saved) {
              const items = (JSON.parse(saved) as CartItem[]).map(migrateCartItem)
              if (items.length > 0) {
                setCartRaw(items)
              }
            }
          } catch { /**/ }

          // M23: Loyalty-Balance laden
          fetch(`/api/loyalty/balance`)
            .then(r => r.json())
            .then((balances: { project_id: string; balance_cents: number; order_count: number; last_order_at: string | null }[]) => {
              const b = Array.isArray(balances) ? balances.find(lb => lb.project_id === projectId) : null
              if (b && b.balance_cents > 0) {
                // 90-Tage-Verfall prüfen
                let effectiveBalance = b.balance_cents
                let effectiveCount = b.order_count
                if (b.last_order_at) {
                  const daysSince = (Date.now() - new Date(b.last_order_at).getTime()) / (1000 * 60 * 60 * 24)
                  if (daysSince > 90) { effectiveBalance = 0; effectiveCount = 0 }
                }
                const willRedeem = (effectiveCount + 1) >= 6 && effectiveBalance > 0
                setLoyaltyInfo({
                  balanceCents: effectiveBalance,
                  orderCount: effectiveCount,
                  willRedeem,
                  redeemCents: 0, // wird in Pricing berechnet
                })
              } else {
                setLoyaltyInfo(null)
              }
            })
            .catch(() => { /* ignorieren */ })
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
            const items = (JSON.parse(saved) as CartItem[]).map(migrateCartItem)
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
    const groups = (item.menu_option_groups ?? []).filter(g => g.menu_options?.length > 0)
    if (groups.length > 0) {
      // Has options → open detail modal (with inline options)
      openItemDetail(item)
      return
    }
    // No options → add directly
    setCart(prev => {
      const ex = prev.find(c => c.menuItemId === item.id && (c.selectedOptions ?? []).length === 0)
      if (ex) return prev.map(c => c.cartEntryId === ex.cartEntryId ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { cartEntryId: crypto.randomUUID(), menuItemId: item.id, name: item.name, priceInCents: item.price, quantity: 1, selectedOptions: [], optionsSurcharge: 0 }]
    })
  }

  // Öffnet Detail-Modal (Produktinfo + Optionen + Warenkorb)
  const openItemDetail = (item: MenuItem) => {
    const groups = (item.menu_option_groups ?? []).filter(g => g.menu_options?.length > 0)
    setDetailItem(item)
    setDrawerQty(1)
    setDrawerNote('')
    // Keine Vorauswahl — Kunde wählt explizit
    const empty = new Map<string, Set<string>>()
    groups.forEach(g => empty.set(g.id, new Set()))
    setDrawerSelections(empty)
  }

  const addToCartWithOptions = () => {
    if (!drawerItem) return
    const groups = (drawerItem.menu_option_groups ?? [])
    const allOptions: SelectedOption[] = []
    for (const g of groups) {
      const selected = drawerSelections.get(g.id) ?? new Set()
      for (const optId of selected) {
        const opt = g.menu_options.find(o => o.id === optId)
        if (opt) allOptions.push({ optionId: opt.id, optionName: opt.name, groupName: g.name, priceCents: opt.price_cents })
      }
    }
    const surcharge = allOptions.reduce((s, o) => s + o.priceCents, 0)
    const entry: CartItem = {
      cartEntryId: crypto.randomUUID(),
      menuItemId: drawerItem.id,
      name: drawerItem.name,
      priceInCents: drawerItem.price,
      quantity: drawerQty,
      selectedOptions: allOptions,
      optionsSurcharge: surcharge,
      customerNote: drawerNote.trim() || undefined,
    }
    setCart(prev => [...prev, entry])
    setDrawerItem(null)
  }

  const changeQty = (cartEntryId: string, delta: number) => {
    setCart(prev => prev.map(c => c.cartEntryId === cartEntryId ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0))
  }

  const clearCart = () => {
    setCartRaw([])
    try { localStorage.removeItem(cartKey) } catch { /**/ }
  }

  // ── Pricing ───────────────────────────────────────────────────────────────
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  // M28: Subtotal inkl. Options-Aufpreise
  const subtotalCents = cart.reduce((s, i) => s + (i.priceInCents + i.optionsSurcharge) * i.quantity, 0)
  // Rabatt: Eingeloggt → clientseitige DB-Prüfung (payRestrictions) als Source-of-Truth
  const discountProjectEnabled = discountInfo.pct > 0 // Restaurant hat Willkommensrabatt konfiguriert
  const isEligibleForDiscount = session?.userId
    ? (payRestrictions ? payRestrictions.isFirstOrder : discountInfo.enabled) // eingeloggt: live DB-Check, Fallback Server-Prop
    : discountInfo.enabled // nicht eingeloggt: Server-Prop
  const showDiscount = !!(isEligibleForDiscount && discountProjectEnabled && session?.userId)
  const discountCents = showDiscount ? Math.round(subtotalCents * discountInfo.pct / 100) : 0
  const freeAbove = deliveryInfo.freeAboveCents
  const freeReached = freeAbove > 0 && subtotalCents >= freeAbove
  const deliveryFeeCents = (orderType === 'delivery' && !freeReached) ? (deliveryInfo.feeCents ?? 0) : 0
  const totalBeforeLoyalty = subtotalCents - discountCents + deliveryFeeCents

  // M23: Loyalty-Abzug nur im Checkout anzeigen (nicht beim Speisen-Browsing)
  const isCheckoutView = view === 'checkout'
  const loyaltyRedeemCents = (isCheckoutView && loyaltyInfo?.willRedeem && loyaltyInfo.balanceCents > 0)
    ? Math.min(loyaltyInfo.balanceCents, totalBeforeLoyalty)
    : 0
  const loyaltyLostCents = (isCheckoutView && loyaltyInfo?.willRedeem && loyaltyInfo.balanceCents > totalBeforeLoyalty)
    ? loyaltyInfo.balanceCents - totalBeforeLoyalty
    : 0
  const totalCents = totalBeforeLoyalty - loyaltyRedeemCents
  const loyaltyCoversAll = loyaltyRedeemCents > 0 && totalCents <= 0

  const minOrderCents = deliveryInfo.minOrderCents ?? 0
  const belowMin = orderType === 'delivery' && minOrderCents > 0 && subtotalCents < minOrderCents

  // ── M25: Stripe mounten (imperativ aufgerufen aus runCardFlow) ─────────────
  const mountStripe = async (clientSecret: string) => {
    const { loadStripe } = await import('@stripe/stripe-js')
    const stripe = await loadStripe(stripePublishableKey!)
    if (!stripe) { setStripeLoading(false); return }

    // Warten bis der Container im DOM ist (React State-Update muss erst re-rendern)
    let container: HTMLElement | null = null
    for (let i = 0; i < 40; i++) {
      container = document.getElementById('stripe-payment-element')
      if (container) break
      await new Promise<void>(resolve => setTimeout(resolve, 50))
    }
    if (!container) { setStripeLoading(false); return }

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
    paymentElement.mount(container)
    setStripeInstance(stripe)
    setStripeElements(elements)
    paymentElement.on('ready', () => setStripeLoading(false))
  }

  // ── Loyalty nach Bestellung neu laden ──────────────────────────────────────
  const reloadLoyalty = () => {
    fetch(`/api/loyalty/balance`)
      .then(r => r.ok ? r.json() : [])
      .then((all: { project_id: string; balance_cents: number; order_count: number; last_order_at: string | null }[]) => {
        const b = all.find((x: { project_id: string }) => x.project_id === projectId)
        if (b) {
          let effectiveBalance = b.balance_cents
          let effectiveCount = b.order_count
          if (b.last_order_at) {
            const daysSince = (Date.now() - new Date(b.last_order_at).getTime()) / (1000 * 60 * 60 * 24)
            if (daysSince > 90) { effectiveBalance = 0; effectiveCount = 0 }
          }
          const willRedeem = (effectiveCount + 1) >= 6 && effectiveBalance > 0
          setLoyaltyInfo({ balanceCents: effectiveBalance, orderCount: effectiveCount, willRedeem, redeemCents: 0 })
        }
      })
      .catch(() => {})
  }

  // ── Submit (Cash) ─────────────────────────────────────────────────────────
  const submitOrder = useCallback(async () => {
    const deliveryAddress = orderType === 'delivery'
      ? `${deliveryStreet.trim()}, ${deliveryZip.trim()} ${deliveryCity.trim()}`
      : undefined
    const pickupSlotLabel = selectedSlot || undefined
    // Auth ist bereits abgeschlossen (im Auth-View) — immer 'existing'
    const mode = 'existing' as const

    // M28: Map cart items → server action format (strip optionId, include customerNote)
    const serverItems = cart.map(c => ({
      menuItemId: c.menuItemId,
      name: c.name,
      priceInCents: c.priceInCents,
      quantity: c.quantity,
      selectedOptions: (c.selectedOptions ?? []).map(o => ({
        optionName: o.optionName,
        groupName: o.groupName,
        priceCents: o.priceCents,
      })),
      customerNote: c.customerNote,
    }))

    const result = await checkoutWithAuth({
      mode,
      projectId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      items: serverItems,
      orderType,
      deliveryAddress,
      tableNumber: tableNumber ?? undefined,
      pickupSlot: pickupSlotLabel,
      paymentMode: paymentMethod,
    })

    return result
  }, [authTab, cart, deliveryCity, deliveryStreet, deliveryZip, email, name, orderType, password, paymentMethod, phone, projectId, selectedSlot, session, tableNumber])

  const handleCheckout = () => {
    setFormError(null)

    // User muss eingeloggt sein (sollte durch den Auth-View sichergestellt sein)
    if (!session?.userId) { setView('auth'); return }

    if (orderType === 'delivery') {
      if (!deliveryStreet.trim() || !deliveryZip.trim() || !deliveryCity.trim()) {
        setFormError('Bitte gib deine vollständige Lieferadresse ein.'); return
      }
      if (belowMin) { setFormError(`Mindestbestellwert: ${eur(minOrderCents)}`); return }
    }

    if (paymentMethod === 'card') {
      // ── Card Flow (kein startTransition — sonst deferred React den Render
      //    und der Stripe-Container erscheint nicht rechtzeitig im DOM)
      const runCardFlow = async () => {
        // 1. Bestellung aufgeben
        const result = await submitOrder()
        if (result.error) { setFormError(result.error); return }
        if (!result.orderId) { setFormError('Bestellfehler. Bitte versuche es erneut.'); return }

        const newOrderId = result.orderId
        setOrderId(newOrderId)
        setOrderItems([...cart])
        setOrderTotal(totalCents)

        // 2. Loyalty deckt alles ab? → Direkt als bezahlt markieren
        if (loyaltyCoversAll) {
          clearCart()
          setView('status')
          reloadLoyalty()
          getCustomerSession().then(s => { setSession(s); if (s.userId) getPaymentRestrictions(projectId).then(setPayRestrictions).catch(() => {}) })
          return
        }

        // 3. Payment Intent erstellen (mit reduziertem Betrag)
        const chargeAmount = Math.max(50, totalCents) // Stripe minimum: 50 Cent
        setStripeLoading(true)
        const piRes = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, amountCents: chargeAmount, orderId: newOrderId }),
        })
        const piText = await piRes.text()
        let piJson: { clientSecret?: string; error?: string } = {}
        try { piJson = JSON.parse(piText) } catch {
          setStripeLoading(false)
          setFormError('Stripe-Fehler. Bitte versuche Barzahlung.')
          return
        }

        if (piJson.error || !piJson.clientSecret) {
          setStripeLoading(false)
          setFormError(piJson.error ?? 'Stripe-Fehler. Bitte versuche Barzahlung.')
          return
        }

        // 4. clientSecret setzen → Container div erscheint → dann Stripe mounten
        setStripeClientSecret(piJson.clientSecret)
        await mountStripe(piJson.clientSecret)
      }
      void runCardFlow()
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
        reloadLoyalty()
        getCustomerSession().then(s => { setSession(s); if (s.userId) getPaymentRestrictions(projectId).then(setPayRestrictions).catch(() => {}) })
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
      // Payment succeeded without redirect (e.g. Google/Apple Pay, test cards)
      // → Sofort payment_status auf 'paid' setzen (statt auf Webhook zu warten)
      if (orderId) {
        fetch('/api/stripe/confirm-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        }).then(() => {
          // Drive-In Status laden nachdem payment_status aktualisiert wurde
          fetch(`/api/drive-in/status?orderId=${orderId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setDriveIn(d) })
            .catch(() => {})
        }).catch(() => {})
      }
      clearCart()
      setView('status')
      reloadLoyalty()
      getCustomerSession().then(s => { setSession(s); if (s.userId) getPaymentRestrictions(projectId).then(setPayRestrictions).catch(() => {}) })
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
        reloadLoyalty()
        if (session?.userId) {
          getCustomerSession().then(s => { setSession(s); if (s.userId) getPaymentRestrictions(projectId).then(setPayRestrictions).catch(() => {}) })
        }
      }
    })
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: MENU
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'menu') return (
    <div style={{ background: '#0d0d0d', minHeight: '100%' }}>
      {/* Hinweis: Weitere Restaurants auf Bizzn */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('bizzn:close-panel'))}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          width: '100%', padding: '8px 16px', fontSize: '11px', fontWeight: 600,
          color: '#C7A17A', background: 'rgba(199,161,122,0.05)',
          borderBottom: '1px solid rgba(199,161,122,0.1)',
          border: 'none', cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(199,161,122,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(199,161,122,0.05)')}
      >
        🍽️ Entdecke weitere Restaurants auf Bizzn →
      </button>
      {/* Category List */}
      <div style={{ padding: '16px', paddingBottom: '120px' }}>

        {/* Allergen-Filter-Leiste */}
        {hasAnyAllergenData && (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setShowFilterBar(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                background: (excludedAllergens.size > 0 || requiredLabel) ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${(excludedAllergens.size > 0 || requiredLabel) ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
                color: (excludedAllergens.size > 0 || requiredLabel) ? '#f87171' : '#6b7280',
                fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
              }}
            >
              <span>🛡️</span>
              <span>{excludedAllergens.size > 0 || requiredLabel ? `Filter aktiv (${excludedAllergens.size + (requiredLabel ? 1 : 0)})` : 'Allergene & Filter'}</span>
              <ChevronDown style={{ width: '14px', height: '14px', marginLeft: 'auto', transform: showFilterBar ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
            </button>

            {showFilterBar && (
              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Label-Filter */}
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Nur anzeigen</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                  {LABEL_DEFS.filter(l => categories.some(c => c.menu_items.some(i => (i.labels ?? []).includes(l.code)))).map(l => {
                    const active = requiredLabel === l.code
                    return (
                      <button
                        key={l.code}
                        onClick={() => setRequiredLabel(active ? null : l.code)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                          border: `1px solid ${active ? l.color + '66' : 'rgba(255,255,255,0.08)'}`,
                          background: active ? l.color + '22' : 'transparent',
                          color: active ? l.color : '#6b7280',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <span>{l.emoji}</span><span>{l.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Allergen-Ausschluss */}
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Allergene ausschließen</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {ALLERGEN_DEFS.map(a => {
                    const active = excludedAllergens.has(a.code)
                    return (
                      <button
                        key={a.code}
                        onClick={() => setExcludedAllergens(prev => {
                          const next = new Set(prev)
                          if (next.has(a.code)) next.delete(a.code); else next.add(a.code)
                          return next
                        })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '3px',
                          padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                          border: `1px solid ${active ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          background: active ? 'rgba(239,68,68,0.12)' : 'transparent',
                          color: active ? '#f87171' : '#6b7280',
                          cursor: 'pointer', transition: 'all 0.15s',
                          textDecoration: active ? 'line-through' : 'none',
                        }}
                      >
                        <span>{a.emoji}</span><span>{a.label}</span>
                      </button>
                    )
                  })}
                </div>

                {(excludedAllergens.size > 0 || requiredLabel) && (
                  <button
                    onClick={() => { setExcludedAllergens(new Set()); setRequiredLabel(null) }}
                    style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Alle Filter zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <p>Speisekarte wird vorbereitet…</p>
          </div>
        ) : categories.map(cat => {
          const isCollapsed = collapsedCats.has(cat.id)
          const activeItems = cat.menu_items.filter(i => i.is_active).filter(isItemVisible)
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
                    return (
                      <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}>
                          {/* Klickbarer Info-Bereich → öffnet immer den Detail-Drawer */}
                          <button
                            onClick={() => openItemDetail(item)}
                            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                          >
                            <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{item.name}</p>
                            {item.description && <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 4px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <p style={{ color: '#C7A17A', fontWeight: 800, fontSize: '14px', margin: 0 }}>{eur(item.price)}</p>
                              {(item.menu_option_groups ?? []).some(g => g.menu_options?.length > 0) && (
                                <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '6px' }}>⚙️ Optionen</span>
                              )}
                              {/* Allergen-Hinweis-Icon wenn Allergene vorhanden */}
                              {(item.allergens ?? []).length > 0 && (
                                <span style={{ fontSize: '10px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '6px' }}>⚠️ Allergene</span>
                              )}
                              {/* Label-Badges */}
                              {(item.labels ?? []).slice(0, 3).map(code => {
                                const def = LABEL_DEFS.find(l => l.code === code)
                                if (!def) return null
                                return (
                                  <span key={code} style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '6px', background: def.color + '18', color: def.color, border: `1px solid ${def.color}33` }}>
                                    {def.emoji} {def.label}
                                  </span>
                                )
                              })}
                            </div>
                          </button>

                          {item.image_url && (
                            <button onClick={() => setLightbox({ src: item.image_url!, alt: item.name })} style={{ border: 'none', background: 'none', padding: 0, cursor: 'zoom-in', flexShrink: 0 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.image_url} alt={item.name} style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover' }} />
                            </button>
                          )}

                          <div style={{ flexShrink: 0 }}>
                            {(() => {
                              const hasOptions = (item.menu_option_groups ?? []).some(g => g.menu_options?.length > 0)
                              const inCartCount = cart.filter(c => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0)
                              return inCartCount > 0 && !hasOptions ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button onClick={() => { const entry = cart.find(c => c.menuItemId === item.id); if (entry) changeQty(entry.cartEntryId, -1) }} style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus style={{ width: '13px', height: '13px' }} /></button>
                                  <span style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '14px', minWidth: '16px', textAlign: 'center' }}>{inCartCount}</span>
                                  <button onClick={() => addToCart(item)} style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#C7A17A', border: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus style={{ width: '13px', height: '13px' }} /></button>
                                </div>
                              ) : (
                                <button onClick={() => addToCart(item)} style={{ position: 'relative', width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(199,161,122,0.15)', border: '1px solid rgba(199,161,122,0.2)', cursor: 'pointer', color: '#C7A17A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Plus style={{ width: '16px', height: '16px' }} />
                                  {inCartCount > 0 && (
                                    <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#C7A17A', color: '#111', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inCartCount}</span>
                                  )}
                                </button>
                              )
                            })()}
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

      {/* ══ M28: Options Drawer (Bottom Sheet) ══════════════════════════════════ */}
      {drawerItem && (() => {
        const groups = (drawerItem.menu_option_groups ?? [])
          .filter(g => g.menu_options?.length > 0)
          .sort((a, b) => a.sort_order - b.sort_order)

        // Validation
        const missingRequired = groups.filter(g => {
          if (!g.is_required) return false
          const selected = drawerSelections.get(g.id) ?? new Set()
          return selected.size < g.min_select || selected.size === 0
        })
        const canAdd = missingRequired.length === 0

        // Live price
        let surcharge = 0
        for (const g of groups) {
          const sel = drawerSelections.get(g.id) ?? new Set()
          for (const optId of sel) {
            const opt = g.menu_options.find(o => o.id === optId)
            if (opt) surcharge += opt.price_cents
          }
        }
        const drawerTotal = (drawerItem.price + surcharge) * drawerQty

        const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
          setDrawerSelections(prev => {
            const next = new Map(prev)
            const current = new Set(next.get(groupId) ?? [])
            if (current.has(optionId)) {
              current.delete(optionId)
            } else {
              if (maxSelect === 1) {
                // Radio: nur eine Auswahl
                current.clear()
                current.add(optionId)
              } else if (current.size < maxSelect) {
                current.add(optionId)
              }
            }
            next.set(groupId, current)
            return next
          })
        }

        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setDrawerItem(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#141414', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                animation: 'slideUpDrawer 0.25s ease-out',
              }}
            >
              <style>{`@keyframes slideUpDrawer { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

              {/* Header */}
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '18px', margin: '0 0 4px' }}>{drawerItem.name}</p>
                    {drawerItem.description && <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 6px', lineHeight: '1.4' }}>{drawerItem.description}</p>}
                    <p style={{ color: '#C7A17A', fontWeight: 800, fontSize: '15px', margin: 0 }}>ab {eur(drawerItem.price)}</p>
                    {/* Labels im Drawer */}
                    {(drawerItem.labels ?? []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {(drawerItem.labels ?? []).map(code => {
                          const def = LABEL_DEFS.find(l => l.code === code)
                          if (!def) return null
                          return <span key={code} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: def.color + '18', color: def.color }}>{def.emoji} {def.label}</span>
                        })}
                      </div>
                    )}
                    {/* Allergene im Drawer */}
                    {(drawerItem.allergens ?? []).length > 0 && (
                      <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(245,158,11,0.06)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>⚠️ Enthält</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(drawerItem.allergens ?? []).map(code => {
                            const def = ALLERGEN_DEFS.find(a => a.code === code)
                            if (!def) return null
                            return <span key={code} style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>{def.emoji} {def.label}</span>
                          })}
                        </div>
                      </div>
                    )}
                    {/* Zusatzstoffe im Drawer */}
                    {(drawerItem.additives ?? []).length > 0 && (
                      <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                        Zusatzstoffe: {(drawerItem.additives ?? []).join(', ')}
                      </p>
                    )}
                    {/* Nährwerte im Drawer */}
                    {drawerItem.nutritional_info && Object.keys(drawerItem.nutritional_info).length > 0 && (
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {drawerItem.nutritional_info.calories != null && <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '6px' }}>{drawerItem.nutritional_info.calories} kcal</span>}
                        {drawerItem.nutritional_info.protein != null && <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '6px' }}>{drawerItem.nutritional_info.protein}g Protein</span>}
                        {drawerItem.nutritional_info.carbs != null && <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '6px' }}>{drawerItem.nutritional_info.carbs}g Kohlenhydrate</span>}
                        {drawerItem.nutritional_info.fat != null && <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '6px' }}>{drawerItem.nutritional_info.fat}g Fett</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setDrawerItem(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✕</button>
                </div>
              </div>

              {/* Scrollable content: Options + Allergen-Info */}
              <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
                {groups.length > 0 && groups.map(g => {
                  const selected = drawerSelections.get(g.id) ?? new Set()
                  const isRadio = g.max_select === 1
                  const selectLabel = g.is_required
                    ? (g.min_select === g.max_select ? `genau ${g.min_select}` : `${g.min_select}–${g.max_select}`)
                    : (g.max_select > 1 ? `bis zu ${g.max_select}` : 'optional')
                  const isMissing = missingRequired.includes(g)

                  return (
                    <div key={g.id} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '13px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{g.name}</p>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px',
                          background: g.is_required ? (isMissing ? 'rgba(239,68,68,0.15)' : 'rgba(199,161,122,0.12)') : 'rgba(255,255,255,0.06)',
                          color: g.is_required ? (isMissing ? '#f87171' : '#C7A17A') : '#6b7280',
                          border: `1px solid ${g.is_required ? (isMissing ? 'rgba(239,68,68,0.3)' : 'rgba(199,161,122,0.25)') : 'rgba(255,255,255,0.08)'}`,
                        }}>
                          {g.is_required ? 'Pflicht' : 'Optional'} · {selectLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {g.menu_options.sort((a, b) => a.sort_order - b.sort_order).map(opt => {
                          const isSelected = selected.has(opt.id)
                          return (
                            <button
                              key={opt.id}
                              onClick={() => toggleOption(g.id, opt.id, g.max_select)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                                borderRadius: '10px', border: '1px solid', cursor: 'pointer', width: '100%', textAlign: 'left',
                                background: isSelected ? 'rgba(199,161,122,0.1)' : 'rgba(255,255,255,0.03)',
                                borderColor: isSelected ? 'rgba(199,161,122,0.4)' : 'rgba(255,255,255,0.07)',
                                transition: 'all 0.15s',
                              }}
                            >
                              {/* Radio / Checkbox indicator */}
                              <div style={{
                                width: '20px', height: '20px', borderRadius: isRadio ? '50%' : '6px',
                                border: `2px solid ${isSelected ? '#C7A17A' : 'rgba(255,255,255,0.2)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                background: isSelected ? '#C7A17A' : 'transparent', transition: 'all 0.15s',
                              }}>
                                {isSelected && (
                                  isRadio
                                    ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#111' }} />
                                    : <span style={{ color: '#111', fontSize: '12px', fontWeight: 900 }}>✓</span>
                                )}
                              </div>
                              <span style={{ flex: 1, color: isSelected ? '#f0f0f0' : '#9ca3af', fontSize: '14px', fontWeight: isSelected ? 700 : 500 }}>{opt.name}</span>
                              {opt.price_cents > 0 && (
                                <span style={{ color: '#C7A17A', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>+{eur(opt.price_cents)}</span>
                              )}
                              {opt.price_cents === 0 && (
                                <span style={{ color: '#4b5563', fontSize: '12px' }}>inklusive</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Anmerkung nur für Artikel mit Optionen */}
                {groups.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ color: '#6b7280', fontWeight: 700, fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>📝 Anmerkung (optional)</p>
                    <textarea
                      value={drawerNote}
                      onChange={e => setDrawerNote(e.target.value)}
                      placeholder="z.B. ohne Zwiebeln, extra scharf…"
                      rows={2}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#f0f0f0', fontSize: '13px', outline: 'none', resize: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                )}
              </div>


              {/* Footer: Menge + Hinzufügen */}
              <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>

                {/* Quantity controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                  <button onClick={() => setDrawerQty(q => Math.max(1, q - 1))} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>−</button>
                  <span style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '18px', minWidth: '20px', textAlign: 'center' }}>{drawerQty}</span>
                  <button onClick={() => setDrawerQty(q => q + 1)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#C7A17A', border: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>+</button>
                </div>

                {/* Validation hint */}
                {!canAdd && missingRequired.length > 0 && (
                  <p style={{ color: '#f87171', fontSize: '12px', textAlign: 'center', margin: '0 0 8px' }}>
                    Bitte wähle: {missingRequired.map(g => g.name).join(', ')}
                  </p>
                )}

                {/* Add to cart */}
                <button
                  onClick={addToCartWithOptions}
                  disabled={!canAdd}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '14px',
                    background: canAdd ? 'linear-gradient(135deg, #c7a17a, #d4a870)' : 'rgba(255,255,255,0.08)',
                    border: 'none', cursor: canAdd ? 'pointer' : 'not-allowed',
                    color: canAdd ? '#111' : '#4b5563', fontWeight: 900, fontSize: '15px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: canAdd ? '0 4px 20px rgba(199,161,122,0.3)' : 'none',
                    opacity: canAdd ? 1 : 0.6, transition: 'all 0.2s',
                  }}
                >
                  <ShoppingCart style={{ width: '18px', height: '18px' }} />
                  <span>In den Warenkorb</span>
                  <span>{eur(drawerTotal)}</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}


      {/* ══ Produkt-Detail-Modal ════════════════════════════════════════════════ */}
      {detailItem && (() => {
        const hasOptions = (detailItem.menu_option_groups ?? []).some(g => g.menu_options?.length > 0)
        return (
          <div
            onClick={() => setDetailItem(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 201,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
              padding: '20px',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#141414', borderRadius: '20px',
                width: '100%', maxWidth: '460px',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                animation: 'slideUpDrawer 0.2s ease-out',
                overflow: 'hidden',
              }}
            >
              {/* Hero-Bild */}
              {detailItem.image_url ? (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', flexShrink: 0, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detailItem.image_url}
                    alt={detailItem.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Gradient overlay */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, #141414, transparent)' }} />
                  {/* Close button */}
                  <button
                    onClick={() => setDetailItem(null)}
                    style={{ position: 'absolute', top: '12px', right: '12px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', backdropFilter: 'blur(4px)' }}
                  >✕</button>
                </div>
              ) : (
                /* Kein Bild: Gradient-Placeholder + Close */
                <div style={{ position: 'relative', width: '100%', height: '80px', background: 'linear-gradient(135deg, rgba(199,161,122,0.15), rgba(199,161,122,0.05))', flexShrink: 0 }}>
                  <button
                    onClick={() => setDetailItem(null)}
                    style={{ position: 'absolute', top: '12px', right: '12px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
                  >✕</button>
                </div>
              )}

              {/* Scrollbare Inhalte */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>

                {/* Name + Preis */}
                <div style={{ marginBottom: '12px' }}>
                  <h2 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '22px', margin: '0 0 4px', lineHeight: 1.2 }}>{detailItem.name}</h2>
                  <p style={{ color: '#C7A17A', fontWeight: 800, fontSize: '18px', margin: '0 0 6px' }}>{eur(detailItem.price)}</p>

                  {/* Labels */}
                  {(detailItem.labels ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                      {(detailItem.labels ?? []).map(code => {
                        const def = LABEL_DEFS.find(l => l.code === code)
                        if (!def) return null
                        return (
                          <span key={code} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: def.color + '22', color: def.color, border: `1px solid ${def.color}44` }}>
                            {def.emoji} {def.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Beschreibung */}
                {detailItem.description && (
                  <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }}>
                    {detailItem.description}
                  </p>
                )}

                {/* Optionen-Hinweis */}
                {hasOptions && (
                  <div style={{ padding: '8px 12px', background: 'rgba(199,161,122,0.06)', borderRadius: '10px', border: '1px solid rgba(199,161,122,0.15)', marginBottom: '14px' }}>
                    <p style={{ color: '#C7A17A', fontSize: '12px', fontWeight: 700, margin: 0 }}>⚙️ Dieses Gericht hat anpassbare Optionen (z.B. Beilagen, Soßen)</p>
                  </div>
                )}

                {/* Allergene */}
                {(detailItem.allergens ?? []).length > 0 && (
                  <div style={{ marginBottom: '14px', padding: '12px 14px', background: 'rgba(245,158,11,0.05)', borderRadius: '14px', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>⚠️ Enthaltene Allergene</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(detailItem.allergens ?? []).map(code => {
                        const def = ALLERGEN_DEFS.find(a => a.code === code)
                        if (!def) return null
                        return (
                          <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <span style={{ fontSize: '14px' }}>{def.emoji}</span>
                            {def.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Zusatzstoffe */}
                {(detailItem.additives ?? []).length > 0 && (
                  <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Zusatzstoffe</p>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
                      {(detailItem.additives ?? []).map(code => {
                        const labels: Record<string, string> = { colorants: 'Farbstoff', preservatives: 'Konservierungsstoff', antioxidants: 'Antioxidationsmittel', flavor_enhancers: 'Geschmacksverstärker', sweeteners: 'Süßungsmittel', phosphate: 'Phosphat', caffeine: 'Koffein', quinine: 'Chinin', waxed: 'Gewachst', blackened: 'Geschwärzt' }
                        return labels[code] ?? code
                      }).join(', ')}
                    </p>
                  </div>
                )}

                {/* Nährwerte */}
                {detailItem.nutritional_info && Object.keys(detailItem.nutritional_info).length > 0 && (
                  <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Nährwerte pro Portion</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {([
                        { key: 'calories', label: 'kcal' },
                        { key: 'protein', label: 'Protein' },
                        { key: 'carbs', label: 'Kohlenhydrate' },
                        { key: 'fat', label: 'Fett' },
                        { key: 'fiber', label: 'Ballaststoffe' },
                      ] as const).map(f => {
                        const val = detailItem.nutritional_info?.[f.key]
                        if (val == null) return null
                        return (
                          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', minWidth: '60px' }}>
                            <span style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '15px' }}>{val}</span>
                            <span style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px' }}>{f.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={{ height: '8px' }} />
              </div>

              {/* ── Optionen (inline im Modal) ──────────────────────────────── */}
              {(() => {
                const detailGroups = (detailItem.menu_option_groups ?? [])
                  .filter(g => g.menu_options?.length > 0)
                  .sort((a, b) => a.sort_order - b.sort_order)

                const detailMissingRequired = detailGroups.filter(g => {
                  if (!g.is_required) return false
                  const sel = drawerSelections.get(g.id) ?? new Set()
                  return sel.size < g.min_select || sel.size === 0
                })
                const detailCanAdd = detailMissingRequired.length === 0

                // Live-Preis berechnen
                let detailSurcharge = 0
                for (const g of detailGroups) {
                  const sel = drawerSelections.get(g.id) ?? new Set()
                  for (const optId of sel) {
                    const opt = g.menu_options.find(o => o.id === optId)
                    if (opt) detailSurcharge += opt.price_cents
                  }
                }
                const detailTotal = (detailItem.price + detailSurcharge) * drawerQty

                return (
                  <>
                    {detailGroups.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
                        {detailGroups.map(g => {
                          const selected = drawerSelections.get(g.id) ?? new Set()
                          const isRadio = g.max_select === 1
                          const selectLabel = g.is_required
                            ? (g.min_select === g.max_select ? `genau ${g.min_select}` : `${g.min_select}–${g.max_select}`)
                            : (g.max_select > 1 ? `bis zu ${g.max_select}` : 'optional')
                          const isMissing = detailMissingRequired.includes(g)

                          return (
                            <div key={g.id} style={{ paddingTop: '14px', paddingBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '13px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{g.name}</p>
                                <span style={{
                                  fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px',
                                  background: g.is_required ? (isMissing ? 'rgba(239,68,68,0.15)' : 'rgba(199,161,122,0.12)') : 'rgba(255,255,255,0.06)',
                                  color: g.is_required ? (isMissing ? '#f87171' : '#C7A17A') : '#6b7280',
                                  border: `1px solid ${g.is_required ? (isMissing ? 'rgba(239,68,68,0.3)' : 'rgba(199,161,122,0.25)') : 'rgba(255,255,255,0.08)'}`,
                                }}>
                                  {g.is_required ? 'Pflicht' : 'Optional'} · {selectLabel}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {g.menu_options.sort((a, b) => a.sort_order - b.sort_order).map(opt => {
                                  const isSelected = selected.has(opt.id)
                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={() => {
                                        setDrawerSelections(prev => {
                                          const next = new Map(prev)
                                          const cur = new Set(next.get(g.id) ?? [])
                                          if (cur.has(opt.id)) {
                                            cur.delete(opt.id)
                                          } else {
                                            if (isRadio) { cur.clear(); cur.add(opt.id) }
                                            else if (cur.size < g.max_select) cur.add(opt.id)
                                          }
                                          next.set(g.id, cur)
                                          return next
                                        })
                                      }}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', borderRadius: '10px',
                                        background: isSelected ? 'rgba(199,161,122,0.12)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isSelected ? 'rgba(199,161,122,0.4)' : 'rgba(255,255,255,0.07)'}`,
                                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                          width: '18px', height: '18px', borderRadius: isRadio ? '50%' : '5px', flexShrink: 0,
                                          border: `2px solid ${isSelected ? '#C7A17A' : 'rgba(255,255,255,0.2)'}`,
                                          background: isSelected ? '#C7A17A' : 'transparent',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          {isSelected && <span style={{ color: '#111', fontSize: '10px', fontWeight: 900 }}>✓</span>}
                                        </div>
                                        <span style={{ color: isSelected ? '#f0f0f0' : '#9ca3af', fontSize: '14px', fontWeight: isSelected ? 700 : 400 }}>{opt.name}</span>
                                      </div>
                                      {opt.price_cents > 0 && (
                                        <span style={{ color: '#C7A17A', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>+{eur(opt.price_cents)}</span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}

                        {/* Anmerkung */}
                        <div style={{ paddingTop: '12px', paddingBottom: '4px' }}>
                          <p style={{ color: '#6b7280', fontWeight: 700, fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>📝 Anmerkung (optional)</p>
                          <textarea
                            value={drawerNote}
                            onChange={e => setDrawerNote(e.target.value)}
                            placeholder="z.B. ohne Zwiebeln, extra scharf…"
                            rows={2}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.5)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sticky Footer: Menge + In den Warenkorb */}
                    <div style={{ padding: '14px 20px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                      {/* Mengenwahl (nur bei Optionen) */}
                      {detailGroups.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                          <button onClick={() => setDrawerQty(q => Math.max(1, q - 1))} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>−</button>
                          <span style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '18px', minWidth: '24px', textAlign: 'center' }}>{drawerQty}</span>
                          <button onClick={() => setDrawerQty(q => q + 1)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#C7A17A', border: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>+</button>
                        </div>
                      )}

                      {/* Validation */}
                      {!detailCanAdd && detailMissingRequired.length > 0 && (
                        <p style={{ color: '#f87171', fontSize: '12px', textAlign: 'center', margin: '0 0 8px' }}>
                          Bitte wähle: {detailMissingRequired.map(g => g.name).join(', ')}
                        </p>
                      )}

                      {/* CTA */}
                      <button
                        disabled={!detailCanAdd}
                        onClick={() => {
                          if (detailGroups.length > 0) {
                            // Direkt in den Warenkorb — korrektes SelectedOption-Format
                            const selectedOptions: SelectedOption[] = []
                            let surcharge = 0
                            for (const g of detailGroups) {
                              const sel = drawerSelections.get(g.id) ?? new Set()
                              for (const optId of sel) {
                                const opt = g.menu_options.find(o => o.id === optId)
                                if (opt) {
                                  selectedOptions.push({
                                    optionName: opt.name,
                                    groupName: g.name,
                                    priceCents: opt.price_cents,
                                  })
                                  surcharge += opt.price_cents
                                }
                              }
                            }
                            setCart(prev => [...prev, {
                              cartEntryId: crypto.randomUUID(),
                              menuItemId: detailItem.id,
                              name: detailItem.name,
                              priceInCents: detailItem.price,
                              quantity: drawerQty,
                              selectedOptions,
                              optionsSurcharge: surcharge,
                              customerNote: drawerNote.trim() || undefined,
                            }])
                            setDetailItem(null)
                          } else {
                            addToCart(detailItem)
                            setDetailItem(null)
                          }
                        }}
                        style={{
                          width: '100%', padding: '17px', borderRadius: '16px',
                          background: detailCanAdd ? 'linear-gradient(135deg, #c7a17a, #d4a870)' : 'rgba(255,255,255,0.08)',
                          border: 'none', cursor: detailCanAdd ? 'pointer' : 'not-allowed',
                          color: detailCanAdd ? '#111' : '#4b5563', fontWeight: 900, fontSize: '16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          boxShadow: detailCanAdd ? '0 6px 24px rgba(199,161,122,0.35)' : 'none',
                          opacity: detailCanAdd ? 1 : 0.6, transition: 'all 0.2s',
                        }}
                      >
                        <ShoppingCart style={{ width: '19px', height: '19px' }} />
                        <span>In den Warenkorb</span>
                        <span>{eur(detailGroups.length > 0 ? detailTotal : detailItem.price)}</span>
                      </button>
                    </div>
                  </>
                )
              })()}

            </div>
          </div>
        )
      })()}

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
            <div key={item.cartEntryId} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{item.name}</p>
                {(item.selectedOptions ?? []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                    {(item.selectedOptions ?? []).map((o, i) => (
                      <span key={i} style={{ fontSize: '11px', color: '#C7A17A', background: 'rgba(199,161,122,0.1)', border: '1px solid rgba(199,161,122,0.2)', borderRadius: '6px', padding: '2px 6px' }}>
                        {o.optionName}{o.priceCents > 0 ? ` +${eur(o.priceCents)}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {item.customerNote && (
                  <p style={{ fontSize: '11px', color: '#fbbf24', margin: '3px 0 0', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '6px', padding: '3px 6px', display: 'inline-block' }}>
                    📝 {item.customerNote}
                  </p>
                )}
                <p style={{ color: '#6b7280', fontSize: '12px', margin: '4px 0 0' }}>{item.quantity} × {eur(item.priceInCents + item.optionsSurcharge)}</p>
              </div>
              <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '14px', margin: 0, whiteSpace: 'nowrap' }}>{eur((item.priceInCents + item.optionsSurcharge) * item.quantity)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button onClick={() => changeQty(item.cartEntryId, -1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus style={{ width: '11px', height: '11px' }} /></button>
                  <span style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '13px', minWidth: '14px', textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => changeQty(item.cartEntryId, 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#C7A17A', border: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus style={{ width: '11px', height: '11px' }} /></button>
                </div>
                <button onClick={() => changeQty(item.cartEntryId, -item.quantity)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#6b7280', display: 'flex' }}>
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
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

        {/* Willkommensrabatt-Banner für nicht-eingeloggte Nutzer */}
        {!session?.userId && discountInfo.enabled && discountInfo.pct > 0 && subtotalCents > 0 && (
          <div style={{
            borderRadius: '14px', marginBottom: '16px', overflow: 'hidden',
            border: '1px solid rgba(199,161,122,0.3)',
            background: 'linear-gradient(135deg, rgba(199,161,122,0.08), rgba(199,161,122,0.02))',
          }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(199,161,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#C7A17A', fontWeight: 900, fontSize: '14px', margin: '0 0 2px' }}>
                  {discountInfo.pct}% Willkommensrabatt!
                </p>
                <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
                  Registriere dich und spare sofort <strong style={{ color: '#C7A17A' }}>{eur(Math.round(subtotalCents * discountInfo.pct / 100))}</strong> auf deine erste Bestellung
                </p>
              </div>
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
        {!tableNumber && (() => {
          const types: { key: OrderType; label: string; enabled: boolean }[] = [
            { key: 'takeaway', label: '🛍️ Abholung', enabled: pickupEnabled },
            { key: 'delivery', label: '🛵 Lieferung', enabled: deliveryInfo.enabled },
          ]
          const available = types.filter(t => t.enabled)
          if (available.length === 0) return null
          // Auto-select first available if current is disabled
          if (!available.find(t => t.key === orderType)) {
            setTimeout(() => setOrderType(available[0].key), 0)
          }
          return (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ ...S.label, marginBottom: '10px' }}>Bestellart</p>
              <div style={{ display: 'grid', gridTemplateColumns: available.length > 1 ? '1fr 1fr' : '1fr', gap: '8px' }}>
                {available.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setOrderType(key)}
                    style={{
                      padding: '10px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                      border: '1px solid',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: orderType === key ? 'rgba(199,161,122,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: orderType === key ? 'rgba(199,161,122,0.5)' : 'rgba(255,255,255,0.07)',
                      color: orderType === key ? '#C7A17A' : '#9ca3af',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

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
            onClick={() => session?.userId ? setView('checkout') : setView('auth')}
            disabled={cart.length === 0 || belowMin}
            style={{ ...S.btn('primary'), opacity: (cart.length === 0 || belowMin) ? 0.5 : 1 }}
          >
            Weiter zur Kasse →
          </button>
        )}
        {/* Rabatt-Hinweis für nicht-eingeloggte Nutzer */}
        {!session?.userId && cart.length > 0 && discountInfo.enabled && discountInfo.pct > 0 && (
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#C7A17A', margin: '8px 0 0' }}>
            🎁 Dein <strong>{discountInfo.pct}% Willkommensrabatt</strong> wird im nächsten Schritt abgezogen
          </p>
        )}
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: AUTH (Login / Register — VOR dem Checkout)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'auth') {
    // Bereits eingeloggt? → Direkt zum Checkout
    if (session?.userId) {
      // Use setTimeout to avoid React setState-during-render
      setTimeout(() => setView('checkout'), 0)
      return null
    }

    const handleAuth = async () => {
      setFormError(null)

      if (authTab === 'register') {
        if (!firstName.trim() || firstName.trim().length < 2) { setFormError('Bitte gib deinen Vornamen ein (mind. 2 Zeichen).'); return }
        if (!lastName.trim() || lastName.trim().length < 2) { setFormError('Bitte gib deinen Nachnamen ein (mind. 2 Zeichen).'); return }
        if (!phone.trim()) { setFormError('Bitte gib deine Telefonnummer ein.'); return }
        const phoneCheck = validatePhoneNumber(phone.trim())
        if (!phoneCheck.valid) { setFormError(phoneCheck.error || 'Ungültige Telefonnummer.'); return }
      }
      if (!email.trim()) { setFormError('Bitte gib deine E-Mail-Adresse ein.'); return }
      if (!password) { setFormError('Bitte gib ein Passwort ein.'); return }
      if (authTab === 'register' && password.length < 6) { setFormError('Das Passwort muss mindestens 6 Zeichen lang sein.'); return }

      setAuthPending(true)
      try {
        if (authTab === 'register') {
          const result = await signUpCustomer({ projectId, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, phone: phone.trim(), consentPush: true, consentEmail: false })
          if ('error' in result) { setFormError(result.error); setAuthPending(false); return }
        } else {
          const result = await signInCustomer({ projectId, email: email.trim(), password })
          if ('error' in result) { setFormError(result.error); setAuthPending(false); return }
        }

        // Auth erfolgreich → Session laden + zum Checkout
        const s = await getCustomerSession()
        setSession(s)
        if (s.userId) {
          getPaymentRestrictions(projectId).then(setPayRestrictions).catch(() => {})
          if (s.firstName) setFirstName(s.firstName)
          if (s.lastName) setLastName(s.lastName)
          if (s.email) setEmail(s.email)
          if (s.phone) setPhone(s.phone)
        }
        setFormError(null)
        setView('checkout')
      } catch {
        setFormError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.')
      } finally {
        setAuthPending(false)
      }
    }

    return (
      <div style={{ background: '#0d0d0d', minHeight: '100%' }}>
        <div style={{ padding: '20px', paddingBottom: '32px' }}>

          <button onClick={() => { setView('cart'); setFormError(null) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#C7A17A', fontWeight: 700, fontSize: '13px', padding: '0', marginBottom: '20px' }}>
            <ChevronLeft style={{ width: '16px', height: '16px' }} /> Zurück zum Warenkorb
          </button>

          <h2 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '20px', margin: '0 0 4px' }}>Anmelden</h2>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px' }}>
            Erstelle ein Konto oder melde dich an, um deine Bestellung abzuschließen
          </p>

          {/* Auth Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '24px' }}>
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
                {t === 'register' ? '✨ Neues Konto' : 'Anmelden'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Name + Telefon: nur bei Registrierung */}
            {authTab === 'register' && (
              <>
                <InputField id="auth-firstname" label="Vorname" value={firstName} onChange={setFirstName} placeholder="Dein Vorname" icon={User} required />
                <InputField id="auth-lastname" label="Nachname" value={lastName} onChange={setLastName} placeholder="Dein Nachname" icon={User} required />
                <InputField id="auth-phone" label="Telefon" type="tel" value={phone} onChange={setPhone} placeholder="+49 171 1234567" icon={Phone} required />
              </>
            )}

            {/* E-Mail + Passwort */}
            <InputField id="auth-email" label="E-Mail" type="email" value={email} onChange={setEmail} placeholder="du@beispiel.de" icon={Mail} required />
            <InputField
              id="auth-password"
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
          </div>

          {/* Rabatt-Vorschau beim Registrieren */}
          {authTab === 'register' && discountInfo.enabled && discountInfo.pct > 0 && subtotalCents > 0 && (() => {
            const previewDiscount = Math.round(subtotalCents * discountInfo.pct / 100)
            return (
              <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))', border: '1px solid rgba(34,197,94,0.15)' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>
                  🎁 Willkommensrabatt ({discountInfo.pct}%): −{eur(previewDiscount)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280' }}>
                  Wird nach Registrierung automatisch abgezogen
                </p>
              </div>
            )
          })()}

          {/* Fehler */}
          {formError && (
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#f87171' }}>{formError}</p>
            </div>
          )}

          {/* Auth-Button */}
          <button
            onClick={handleAuth}
            disabled={authPending}
            style={{ ...S.btn('primary'), marginTop: '20px', opacity: authPending ? 0.7 : 1 }}
          >
            {authPending
              ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} /> Wird verarbeitet…</>
              : authTab === 'register'
                ? '✨ Registrieren & weiter zur Bestellung'
                : '→ Anmelden & weiter zur Bestellung'
            }
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: CHECKOUT (Zusammenfassung + Zahlung — User ist bereits eingeloggt)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'checkout') return (
    <div style={{ background: '#0d0d0d', minHeight: '100%' }}>
      <div style={{ padding: '20px', paddingBottom: '32px' }}>

        <button onClick={() => { setView('cart'); setFormError(null) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#C7A17A', fontWeight: 700, fontSize: '13px', padding: '0', marginBottom: '20px' }}>
          <ChevronLeft style={{ width: '16px', height: '16px' }} /> Zurück zum Warenkorb
        </button>

        <h2 style={{ color: '#f0f0f0', fontWeight: 900, fontSize: '20px', margin: '0 0 4px' }}>Deine Bestellung</h2>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px' }}>
          Prüfe deine Bestellung und wähle die Zahlungsart
        </p>

        {/* Gebannt — Bestellung blockiert */}
        {payRestrictions?.isBanned && (
          <div style={{
            padding: '16px 20px', borderRadius: '12px', marginBottom: '20px',
            background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>🚫</span>
              <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '14px' }}>
                Bestellungen gesperrt
              </span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
              Du bist für Bestellungen bei diesem Restaurant gesperrt.
              {payRestrictions.banReason && (
                <><br /><span style={{ color: '#ef4444' }}>Grund: {payRestrictions.banReason}</span></>
              )}
            </p>
            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '8px' }}>
              Bitte kontaktiere das Restaurant für weitere Informationen.
            </p>
          </div>
        )}

        {/* Benutzer-Info */}
        {session?.userId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(199,161,122,0.06)', border: '1px solid rgba(199,161,122,0.12)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(199,161,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User style={{ width: '16px', height: '16px', color: '#C7A17A' }} />
              </div>
              <div>
                <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '13px', margin: 0 }}>{session.firstName && session.lastName ? `${session.firstName} ${session.lastName}` : session.name || session.email?.split('@')[0]}</p>
                <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>{session.email}</p>
              </div>
            </div>
            <button onClick={async () => { await signOutCustomer(); setSession(null); setView('cart') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
              <LogOut style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

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

              {/* Rabatt-Aufschlüsselung */}
              {showDiscount && discountCents > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '4px', fontSize: '13px' }}>
                    <span style={{ color: '#9ca3af' }}>Zwischensumme</span>
                    <span style={{ color: '#9ca3af' }}>{eur(subtotalCents)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>🎁 Willkommensrabatt ({discountInfo.pct}%)</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>−{eur(discountCents)}</span>
                  </div>
                </>
              )}
              {/* Zwischensumme (wenn Loyalty-Abzug angezeigt wird) */}
              {loyaltyRedeemCents > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '4px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>Zwischensumme</span>
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>{eur(totalBeforeLoyalty)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>⭐ Bonuskarten-Guthaben</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>−{eur(loyaltyRedeemCents)}</span>
                  </div>
                </>
              )}

              {/* Hinweis: Guthaben vorhanden aber noch nicht einlösbar */}
              {loyaltyInfo && !loyaltyInfo.willRedeem && loyaltyInfo.balanceCents > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px' }}>⭐</span>
                  <span style={{ color: '#6ee7b7', fontSize: '11px', lineHeight: '1.4' }}>
                    Noch {6 - loyaltyInfo.orderCount - 1} {6 - loyaltyInfo.orderCount - 1 === 1 ? 'Bestellung' : 'Bestellungen'} bis zur Einlösung deines Guthabens (derzeit {eur(loyaltyInfo.balanceCents)})
                  </span>
                </div>
              )}

              {/* Warnung: Guthaben geht verloren wenn zu wenig bestellt */}
              {loyaltyLostCents > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '10px', borderRadius: '8px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠️</span>
                  <span style={{ color: '#fbbf24', fontSize: '11px', lineHeight: '1.5' }}>
                    Dein Guthaben beträgt {eur(loyaltyInfo!.balanceCents)}, aber deine Bestellung nur {eur(totalBeforeLoyalty)}.
                    <strong> {eur(loyaltyLostCents)} verfallen!</strong> Bestelle mehr um dein Guthaben voll zu nutzen.
                  </span>
                </div>
              )}

              {/* Bonuskarten-Gutschrift für diese Bestellung */}
              {session?.userId && !loyaltyInfo?.willRedeem && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', background: 'rgba(199,161,122,0.06)', border: '1px solid rgba(199,161,122,0.12)', marginTop: '4px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🎁 Bonuskarten-Gutschrift
                  </span>
                  <span style={{ color: '#C7A17A', fontSize: '11px', fontWeight: 700 }}>
                    +{eur(Math.round(Math.max(0, subtotalCents - discountCents) * 0.05))}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: loyaltyRedeemCents > 0 ? '4px' : '8px', borderTop: loyaltyRedeemCents > 0 ? 'none' : '1px solid rgba(255,255,255,0.07)', marginTop: loyaltyRedeemCents > 0 ? '0' : '4px' }}>
                <span style={{ color: '#C7A17A', fontWeight: 900, fontSize: '14px' }}>{loyaltyRedeemCents > 0 ? 'Zu zahlen' : 'Gesamt'}</span>
                <span style={{ color: '#C7A17A', fontWeight: 900, fontSize: '14px' }}>{eur(Math.max(0, totalCents))}</span>
              </div>
            </div>
          </div>

          {/* M25: Zahlungsart — verstecken wenn Guthaben alles deckt */}
          {stripeEnabled && orderType !== 'in-store' && !loyaltyCoversAll && (() => {
            // Barzahlung-Limit berechnen
            const r = payRestrictions
            const cashBlocked = r?.isBlacklisted || false
            const cashLimitCents = r?.cashLimitCents ?? 3000
            const isFirstOrder = r?.isFirstOrder ?? (!session?.userId)
            const overLimit = isFirstOrder && totalCents > cashLimitCents
            const cashDisabled = cashBlocked || overLimit
            // Auto-select card wenn cash gesperrt
            if (cashDisabled && paymentMethod === 'cash') {
              setTimeout(() => setPaymentMethod('card'), 0)
            }
            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ ...S.label, marginBottom: '0' }}>💳 {loyaltyRedeemCents > 0 ? 'Restzahlung' : 'Zahlungsart'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => !cashDisabled && setPaymentMethod('cash')}
                  disabled={cashDisabled}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                    cursor: cashDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                    opacity: cashDisabled ? 0.4 : 1,
                    background: paymentMethod === 'cash' && !cashDisabled ? 'rgba(199,161,122,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${paymentMethod === 'cash' && !cashDisabled ? 'rgba(199,161,122,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    color: paymentMethod === 'cash' && !cashDisabled ? '#C7A17A' : '#9ca3af',
                  }}
                >
                  <Banknote style={{ width: '16px', height: '16px' }} /> {loyaltyRedeemCents > 0 ? 'Rest bar' : 'Bar zahlen'}
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
                  <CreditCard style={{ width: '16px', height: '16px' }} /> {loyaltyRedeemCents > 0 ? 'Rest mit Karte' : 'Karte / Apple Pay'}
                </button>
              </div>
              {/* Hinweise */}
              {cashBlocked && (
                <p style={{ fontSize: '11px', color: '#f87171', margin: 0, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' }}>
                  🚫 Barzahlung ist für dein Konto nicht verfügbar. Bitte wähle Kartenzahlung.
                </p>
              )}
              {!cashBlocked && isFirstOrder && !overLimit && (
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  ℹ️ Bei deiner ersten Bestellung ist Barzahlung bis {(cashLimitCents / 100).toFixed(0)} € möglich.
                </p>
              )}
              {!cashBlocked && overLimit && (
                <p style={{ fontSize: '11px', color: '#a78bfa', margin: 0, padding: '6px 10px', background: 'rgba(99,91,255,0.06)', borderRadius: '8px', border: '1px solid rgba(99,91,255,0.12)' }}>
                  💳 Bei deiner ersten Bestellung über {(cashLimitCents / 100).toFixed(0)} € ist nur Kartenzahlung möglich. Ab der nächsten Bestellung auch bar.
                </p>
              )}
            </div>
            )
          })()}

          {/* Stripe Elements Container (erscheint nach Bestellung + PI erstellt) */}
          {stripeClientSecret && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ ...S.label, marginBottom: '0', color: '#a78bfa' }}>🔒 Sichere Zahlung</p>
              <div id="stripe-payment-element" style={{ minHeight: '120px' }} />
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
          {loyaltyCoversAll ? (
            /* Guthaben deckt alles → ein einzelner grüner Button */
            <button
              onClick={handleCheckout}
              disabled={isPending}
              style={{ ...S.btn('primary'), opacity: isPending ? 0.7 : 1, marginTop: '8px',
                background: 'linear-gradient(135deg, #34d399, #10b981)',
                boxShadow: '0 4px 20px rgba(52,211,153,0.4)',
              }}
            >
              {isPending
                ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} /> Wird verarbeitet…</>
                : <>⭐ Mit Guthaben bezahlen</>
              }
            </button>
          ) : stripeClientSecret ? (
            <button
              onClick={handleConfirmCardPayment}
              disabled={isPending || !stripeElements || stripeLoading}
              style={{ ...S.btn('primary'), opacity: (isPending || !stripeElements || stripeLoading) ? 0.7 : 1, marginTop: '8px',
                background: 'linear-gradient(135deg, #635bff, #7c6fff)',
                boxShadow: '0 4px 20px rgba(99,91,255,0.4)',
              }}
            >
              {isPending
                ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} /> Zahlung wird verarbeitet…</>
                : <><CreditCard style={{ width: '18px', height: '18px' }} /> Jetzt bezahlen · {eur(Math.max(0, totalCents))}</>
              }
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isPending || payRestrictions?.isBanned}
              style={{ ...S.btn('primary'), opacity: (isPending || payRestrictions?.isBanned) ? 0.5 : 1, marginTop: '8px', cursor: payRestrictions?.isBanned ? 'not-allowed' : 'pointer' }}
            >
              {isPending
                ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} /> Wird verarbeitet…</>
                : paymentMethod === 'card'
                  ? <><CreditCard style={{ width: '18px', height: '18px' }} /> Weiter zur Zahlung · {eur(Math.max(0, totalCents))}</>
                  : <><ShoppingCart style={{ width: '18px', height: '18px' }} /> Jetzt bestellen · {eur(Math.max(0, totalCents))}</>
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
        {/* Rabatt-Aufschlüsselung wenn Rabatt gewährt wurde */}
        {(() => {
          const itemsSubtotal = orderItems.reduce((s, i) => s + i.priceInCents * i.quantity, 0)
          const discountApplied = itemsSubtotal - orderTotal
          if (discountApplied > 0 && discountInfo.pct > 0) {
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#9ca3af' }}>Zwischensumme</span>
                  <span style={{ color: '#9ca3af' }}>{eur(itemsSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>🎁 Willkommensrabatt ({discountInfo.pct}%)</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>−{eur(discountApplied)}</span>
                </div>
              </>
            )
          }
          return null
        })()}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '6px' }}>
          <span style={{ color: '#C7A17A', fontWeight: 900 }}>Gesamt</span>
          <span style={{ color: '#C7A17A', fontWeight: 900 }}>{eur(orderTotal)}</span>
        </div>
      </div>

      {/* ⭐ Bonuskarten-Guthaben */}
      {session?.userId && (
        (() => {
          // DB-Werte nutzen wenn geladen, sonst Fallback
          const totalBalance = loyaltyInfo ? loyaltyInfo.balanceCents : 0
          const totalOrders = loyaltyInfo ? loyaltyInfo.orderCount : 1
          const remaining = Math.max(0, 6 - totalOrders)
          return (
            <div style={{
              width: '100%', maxWidth: '400px', marginBottom: '24px',
              background: 'linear-gradient(135deg, rgba(199,161,122,0.06), rgba(199,161,122,0.02))',
              border: '1px solid rgba(199,161,122,0.15)',
              borderRadius: '12px', padding: '14px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(199,161,122,0.12)', border: '1px solid rgba(199,161,122,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0,
                }}>⭐</div>
                <div>
                  <p style={{ color: '#C7A17A', fontWeight: 800, fontSize: '14px', margin: '0 0 2px' }}>
                    Bonuskarte
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>
                    Gutschrift für diese Bestellung wurde gutgeschrieben
                  </p>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: '#9ca3af' }}>Gesamtguthaben</span>
                  <span style={{ color: '#f0f0f0', fontWeight: 800 }}>{eur(totalBalance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>Bestellungen</span>
                  <span style={{ color: '#f0f0f0', fontWeight: 700 }}>{totalOrders} / 6</span>
                </div>
                {/* Fortschrittsbalken */}
                <div style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (totalOrders / 6) * 100)}%`, background: 'linear-gradient(90deg, #C7A17A, #d4a870)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
                <p style={{ color: '#6b7280', fontSize: '10px', margin: '6px 0 0', textAlign: 'center' }}>
                  {remaining > 0
                    ? `Noch ${remaining} Bestellung${remaining !== 1 ? 'en' : ''} bis zur Einlösung!`
                    : '🎉 Wird bei deiner nächsten Bestellung eingelöst!'
                  }
                </p>
              </div>
            </div>
          )
        })()
      )}

      {/* M27b: Drive-In VIP-Hinweis + „Ich bin da!" */}
      {driveIn?.eligible && (
        <div style={{
          width: '100%', maxWidth: '400px',
          background: 'linear-gradient(135deg, rgba(199,161,122,0.08), rgba(212,168,112,0.04))',
          border: '1.5px solid rgba(199,161,122,0.3)',
          borderRadius: '16px', padding: '20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(199,161,122,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(199,161,122,0.25), rgba(212,168,112,0.15))',
              border: '1px solid rgba(199,161,122,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>🚗</div>
            <div>
              <p style={{ color: '#C7A17A', fontWeight: 900, fontSize: '15px', margin: '0 0 1px' }}>
                VIP Drive-In verfügbar!
              </p>
              <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                👑 Exklusiv für Bizzn-Pass-Inhaber
              </p>
            </div>
          </div>

          <p style={{
            color: '#d1d5db', fontSize: '13px', lineHeight: '1.6', margin: '0 0 16px',
          }}>
            Wenn du am Restaurant angekommen bist, klicke auf <strong style={{ color: '#C7A17A' }}>&bdquo;Ich bin da!&ldquo;</strong> und
            gib dein Kennzeichen ein — dein Essen wird direkt zu deinem Auto gebracht.
          </p>

          <DriveInArrivalCard
            orderId={orderId!}
            arrived={driveIn.arrived}
            arrivedPlate={driveIn.plate}
          />

          <p style={{
            color: '#6b7280', fontSize: '11px', margin: '12px 0 0', textAlign: 'center',
          }}>
            Du findest diese Funktion auch unter{' '}
            <a
              href="/mein-konto?tab=orders"
              style={{ color: '#C7A17A', textDecoration: 'underline', fontWeight: 600 }}
            >
              Mein Konto → Bestellungen
            </a>
          </p>
        </div>
      )}

      <button onClick={() => { setView('menu'); setOrderId(null); setOrderStatus('pending') }} style={{ ...S.btn('ghost'), maxWidth: '400px' }}>
        Zurück zur Speisekarte
      </button>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  )
}
