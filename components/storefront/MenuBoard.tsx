"use client"

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus, Trash2, Loader2, ChefHat, Tag, ChevronDown, User } from 'lucide-react'
import { placeOrder, type CartItem, type DiscountInfo, type DeliveryInfo } from '@/app/[domain]/actions'
import { getCustomerSession } from '@/app/actions/customer'
import CustomerAuthModal from '@/components/storefront/CustomerAuthModal'
import type { Database } from '@/types/supabase'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

interface MenuBoardProps {
  projectId: string
  projectName: string
  domain: string
  categories: (MenuCategory & { menu_items: MenuItem[] })[]
  kioskMode?: boolean
  isEmbedded?: boolean
  initialTableNumber?: string | null
  discountInfo?: DiscountInfo | null
  deliveryInfo?: DeliveryInfo | null
  inStoreEnabled?: boolean
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MenuBoard({ projectId, projectName, domain, categories, kioskMode = false, isEmbedded = false, initialTableNumber, discountInfo, deliveryInfo, inStoreEnabled = false }: MenuBoardProps) {
  const router = useRouter()
  const CART_KEY = `bizzn-cart-${projectId}`

  // Cart und showCart starten leer (SSR-kompatibel → kein Hydration Error)
  const [cart, setCartRaw] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)

  // Nach dem Hydration-Render: Cart aus localStorage wiederherstellen
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      if (saved) {
        const items = JSON.parse(saved) as CartItem[]
        if (items.length > 0) {
          setCartRaw(items)
          setShowCart(true) // Warenkorb direkt anzeigen
        }
      }
    } catch {}
  }, [CART_KEY])

  const setCart = (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem(CART_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }
  // Alle Kategorien standardmäßig eingeklappt
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id))
  )
  const toggleCat = (id: string) =>
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  // Kiosk mode locks order type to in-store
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery' | 'in-store'>(
    kioskMode ? 'in-store' : 'takeaway'
  )
  const [tableNumber, setTableNumber] = useState(initialTableNumber ?? '')
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  // M19: Lieferadresse
  const [deliveryStreet, setDeliveryStreet] = useState('')
  const [deliveryZip, setDeliveryZip] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [customerSession, setCustomerSession] = useState<{ userId: string | null, name: string | null, email: string | null } | null>(null)
  
  useEffect(() => {
    getCustomerSession().then((session) => {
      setCustomerSession(session)
      if (session?.userId) {
        setCustomerName(session.name ?? session.email?.split('@')[0] ?? '')
        setCustomerContact(session.email ?? '')
      }
    })
  }, [])

  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  // Lightbox state
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const subtotalCents = cart.reduce((s, i) => s + i.priceInCents * i.quantity, 0)
  // M16: Rabatt-Preview
  const showDiscount = !!(discountInfo?.enabled && discountInfo.pct > 0)
  const discountAmountCents = showDiscount ? Math.round(subtotalCents * discountInfo!.pct / 100) : 0
  // M19: Liefergebühr
  const freeAboveCents = deliveryInfo?.freeAboveCents ?? 0
  const freeDeliveryReached = freeAboveCents > 0 && subtotalCents >= freeAboveCents
  const deliveryFeeCents = (orderType === 'delivery' && !freeDeliveryReached) ? (deliveryInfo?.feeCents ?? 0) : 0
  const minOrderCents = deliveryInfo?.minOrderCents ?? 0
  const belowMinOrder = orderType === 'delivery' && minOrderCents > 0 && subtotalCents < minOrderCents
  const totalCents = subtotalCents - discountAmountCents + deliveryFeeCents

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          priceInCents: item.price,
          quantity: 1,
        },
      ]
    })
  }

  const changeQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!customerName.trim()) {
      setFormError('Bitte gib deinen Namen ein.')
      return
    }
    // M19: Lieferadresse prüfen
    if (orderType === 'delivery') {
      if (!deliveryStreet.trim() || !deliveryZip.trim() || !deliveryCity.trim()) {
        setFormError('Bitte gib deine vollständige Lieferadresse ein.')
        return
      }
      if (!deliveryPhone.trim()) {
        setFormError('Bitte gib deine Telefonnummer für die Lieferung an.')
        return
      }
      if (belowMinOrder) {
        setFormError(`Mindestbestellwert für Lieferung: ${formatEur(minOrderCents)}`)
        return
      }
    }
    const deliveryAddress = orderType === 'delivery'
      ? `${deliveryStreet.trim()}, ${deliveryZip.trim()} ${deliveryCity.trim()}`
      : undefined
    startTransition(async () => {
      const result = await placeOrder({
        projectId,
        customerName: customerName.trim(),
        customerContact: orderType === 'delivery' ? deliveryPhone.trim() : customerContact.trim(),
        orderType,
        tableNumber: tableNumber.trim() || undefined,
        items: cart,
        deliveryAddress,
        deliveryFeeCents,
      })
      if (result.error) {
        setFormError(result.error)
      } else if (result.orderId) {
        // Cart nach erfolgreicher Bestellung löschen
        try { localStorage.removeItem(CART_KEY) } catch {}
        setCartRaw([])
        router.push(`/order/${result.orderId}`)
      }
    })
  }

  return (
    <div className={isEmbedded ? 'min-h-screen bg-[#111]' : 'min-h-screen bg-gray-50'}>
      {/* Header */}
      <header className={isEmbedded ? 'sticky top-0 z-30 bg-[#1a1a1a] border-b border-white/10 shadow-sm' : 'sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm'}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C7A17A] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`font-bold text-base leading-none ${isEmbedded ? 'text-white' : 'text-[#1A1A1A]'}`}>{projectName}</p>
              <p className="text-xs text-gray-400">Digitale Speisekarte · bizzn</p>
            </div>
          </div>
          {totalItems > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 bg-[#C7A17A] hover:bg-[#B58E62] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{totalItems}</span>
              <span className="hidden sm:inline">· {formatEur(totalCents)}</span>
              {showDiscount && (
                <span className="hidden sm:inline ml-1 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                  -{discountInfo!.pct}%
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Menu */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-10 pb-32">
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 py-20">Speisekarte wird vorbereitet…</p>
        ) : (
          categories.map((cat) => {
            const isCollapsed = collapsedCats.has(cat.id)
            return (
            <section key={cat.id}>
              <button
                onClick={() => toggleCat(cat.id)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <h2 className={`text-lg font-extrabold mb-4 pb-2 border-b flex items-center justify-between ${isEmbedded ? 'text-white border-white/10' : 'text-[#1A1A1A] border-gray-200'}`}>
                  {cat.name}
                  <ChevronDown
                    className="w-5 h-5 transition-transform duration-200 flex-shrink-0"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', color: '#C7A17A' }}
                  />
                </h2>
              </button>
              {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
              {!isCollapsed && <div className="space-y-3">
                {cat.menu_items.filter((i) => i.is_active).map((item) => {
                  const inCart = cart.find((c) => c.menuItemId === item.id)
                  return (
                    <div
                      key={item.id}
                      className={isEmbedded ? 'bg-[#242424] rounded-2xl border border-white/10 overflow-hidden' : 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'}
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${isEmbedded ? 'text-white' : 'text-[#1A1A1A]'}`}>{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <p className="text-sm font-bold text-[#C7A17A] mt-1">
                            {formatEur(item.price)}
                          </p>
                        </div>
                        {/* Image thumbnail */}
                        {item.image_url && (
                          <button
                            onClick={() => setLightbox({ src: item.image_url!, alt: item.name })}
                            className="shrink-0 group relative focus:outline-none"
                            aria-label={`${item.name} vergrößern`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-20 h-20 rounded-xl object-cover border border-gray-100 group-hover:scale-105 transition-transform duration-200 cursor-zoom-in"
                            />
                            <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                          </button>
                        )}
                        {/* Add-to-cart button */}
                        {inCart ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => changeQty(item.id, -1)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isEmbedded ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{inCart.quantity}</span>
                            <button
                              onClick={() => changeQty(item.id, 1)}
                              className="w-8 h-8 rounded-lg bg-[#C7A17A] hover:bg-[#B58E62] text-white flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="shrink-0 w-9 h-9 rounded-xl bg-[#3D2E1E] hover:bg-[#C7A17A] hover:text-white text-[#C7A17A] flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>}
            </section>
          )})
        )}
      </main>

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className={`relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto ${isEmbedded ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-extrabold ${isEmbedded ? 'text-white' : 'text-[#1A1A1A]'}`}>Deine Bestellung</h2>
              <button
                onClick={() => setShowCart(false)}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                  isEmbedded
                    ? 'text-gray-400 hover:text-white hover:bg-white/10'
                    : 'text-[#C7A17A] hover:bg-[#C7A17A]/10'
                }`}
              >
                <span className="text-base leading-none">←</span>
                Weiter shoppen
              </button>
            </div>

            {/* Cart items */}
            <div className="space-y-3 mb-6">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isEmbedded ? 'text-white' : 'text-[#1A1A1A]'}`}>{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} × {formatEur(item.priceInCents)}
                    </p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums ${isEmbedded ? 'text-white' : 'text-[#1A1A1A]'}`}>
                    {formatEur(item.priceInCents * item.quantity)}
                  </p>
                  <button onClick={() => changeQty(item.menuItemId, -item.quantity)}>
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                  </button>
                </div>
              ))}
            </div>

            {/* M16: Rabatt-Banner */}
            {showDiscount && subtotalCents > 0 && (
              <div className={`mb-4 flex items-center gap-2.5 rounded-xl px-4 py-3 ${isEmbedded ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-amber-50 border border-amber-200'}`}>
                <Tag className={`w-4 h-4 shrink-0 ${isEmbedded ? 'text-amber-400' : 'text-amber-600'}`} />
                <div className="flex-1 text-xs">
                  <p className={`font-bold ${isEmbedded ? 'text-amber-300' : 'text-amber-700'}`}>🎉 {discountInfo!.pct} % Willkommensrabatt!</p>
                  <p className={isEmbedded ? 'text-amber-400/70' : 'text-amber-600'}>Wird automatisch auf deine erste Bestellung angewendet.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">{formatEur(subtotalCents)}</p>
                  <p className={`text-sm font-extrabold ${isEmbedded ? 'text-amber-300' : 'text-amber-700'}`}>-{formatEur(discountAmountCents)}</p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Zwischensumme</span>
                  <span>{formatEur(subtotalCents)}</span>
                </div>
                {showDiscount && subtotalCents > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span>Rabatt ({discountInfo!.pct} %)</span>
                    <span>-{formatEur(discountAmountCents)}</span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>🛵 Liefergebühr</span>
                    <span>
                      {freeDeliveryReached
                        ? <span className="text-green-500 font-semibold line-through opacity-60">{formatEur(deliveryInfo?.feeCents ?? 0)}</span>
                        : deliveryFeeCents > 0 ? formatEur(deliveryFeeCents) : <span className="text-green-500 font-semibold">Kostenlos</span>
                      }
                      {freeDeliveryReached && <span className="text-green-500 font-semibold ml-1">Kostenlos 🎉</span>}
                    </span>
                  </div>
                )}
                {/* Fortschrittsbalken Gratislieferung */}
                {orderType === 'delivery' && freeAboveCents > 0 && !freeDeliveryReached && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>🎁 Noch {formatEur(freeAboveCents - subtotalCents)} bis zur Gratislieferung</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isEmbedded ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-[#C7A17A] to-green-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (subtotalCents / freeAboveCents) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className={`flex justify-between font-extrabold text-lg pt-1 border-t ${isEmbedded ? 'border-white/10' : 'border-gray-100'}`}>
                  <span>Gesamt</span>
                  <span className="text-[#C7A17A]">{formatEur(totalCents)}</span>
                </div>
              </div>
            </div>

            {/* Checkout form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order type selector — hidden in kiosk mode */}
              {kioskMode ? (
                <div className="flex items-center gap-2 bg-[#3D2E1E] border border-[#C7A17A]/30 rounded-xl px-4 py-3">
                  <span className="text-lg">📱</span>
                  <span className="text-sm font-bold text-[#4a8500]">Vor Ort bestellen</span>
                  {tableNumber && (
                    <span className="ml-auto text-xs bg-[#C7A17A] text-white font-bold px-3 py-1 rounded-full">
                      Tisch {tableNumber}
                    </span>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {(['takeaway', 'delivery'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOrderType(type)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        orderType === type
                          ? 'bg-[#C7A17A] border-[#B58E62] text-white'
                          : isEmbedded
                            ? 'bg-[#242424] border-white/10 text-gray-400 hover:border-[#C7A17A]'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-[#C7A17A]'
                      }`}
                    >
                      {type === 'takeaway' ? '🛍️ Abholung' : '🛵 Lieferung'}
                    </button>
                  ))}
                </div>
              )}

              {/* Table number — only editable if not pre-filled from URL */}
              {kioskMode && (
                <input
                  type="text"
                  placeholder="Tischnummer *"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C7A17A] ${isEmbedded ? 'border border-white/15 bg-white/5 text-white placeholder:text-gray-500' : 'border border-gray-200'}`}
                  required
                />
              )}

              {/* M19: Lieferadresse — nur bei Lieferung */}
              {orderType === 'delivery' && (
                <div className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isEmbedded ? 'text-gray-400' : 'text-gray-500'}`}>
                    📍 Lieferadresse
                  </p>
                  {belowMinOrder && (
                    <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Mindestbestellwert: {formatEur(minOrderCents)} — noch {formatEur(minOrderCents - subtotalCents)} fehlen
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Straße und Hausnummer *"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    required
                    className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C7A17A] ${isEmbedded ? 'border border-white/15 bg-white/5 text-white placeholder:text-gray-500' : 'border border-gray-200 bg-gray-50'}`}
                  />
                  <div className="grid grid-cols-5 gap-2">
                    <input
                      type="text"
                      placeholder="PLZ *"
                      value={deliveryZip}
                      onChange={(e) => setDeliveryZip(e.target.value)}
                      required
                      maxLength={5}
                      className={`col-span-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C7A17A] ${isEmbedded ? 'border border-white/15 bg-white/5 text-white placeholder:text-gray-500' : 'border border-gray-200 bg-gray-50'}`}
                    />
                    <input
                      type="text"
                      placeholder="Stadt *"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      required
                      className={`col-span-3 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C7A17A] ${isEmbedded ? 'border border-white/15 bg-white/5 text-white placeholder:text-gray-500' : 'border border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <input
                    type="tel"
                    placeholder="Telefonnummer *"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    required
                    className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C7A17A] ${isEmbedded ? 'border border-white/15 bg-white/5 text-white placeholder:text-gray-500' : 'border border-gray-200 bg-gray-50'}`}
                  />
                </div>
              )}

              {/* Customer Auth Box */}
              {customerSession?.userId ? (
                <div className={`p-4 rounded-xl flex items-center gap-4 ${isEmbedded ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="w-10 h-10 rounded-full bg-[#C7A17A]/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-[#C7A17A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isEmbedded ? 'text-white' : 'text-[#1A1A1A]'}`}>
                      {customerSession.name || customerSession.email?.split('@')[0] || 'Gast'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{customerSession.email}</p>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-xl text-sm text-center ${isEmbedded ? 'text-gray-400 bg-white/5 border border-white/10' : 'text-gray-500 bg-gray-50 border border-gray-100'}`}>
                  Fast geschafft! Logge dich ein oder lege ein Konto an, um deine Bestellung abzuschließen.
                </div>
              )}

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              {customerSession?.userId ? (
                <button
                  type="submit"
                  disabled={isPending || cart.length === 0}
                  className="w-full bg-[#C7A17A] hover:bg-[#B58E62] disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                  {isPending ? 'Wird gesendet…' : `Jetzt bestellen · ${formatEur(totalCents)}`}
                </button>
              ) : (
                <CustomerAuthModal
                  projectId={projectId}
                  projectName={projectName}
                  isEmbedded={isEmbedded}
                  onSuccess={() => {
                    getCustomerSession().then((session) => {
                      setCustomerSession(session)
                      if (session?.userId) {
                        setCustomerName(session.name ?? session.email?.split('@')[0] ?? '')
                        setCustomerContact(session.email ?? '')
                      }
                    })
                  }}
                  customTrigger={
                    <button
                      type="button"
                      className="w-full bg-[#3D2E1E] hover:bg-[#2a2118] text-[#C7A17A] font-bold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2 border border-[#C7A17A]/30 shadow-lg group"
                    >
                      <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Anmelden & Bestellen
                    </button>
                  }
                />
              )}
            </form>
          </div>
        </div>
      )}

      {/* Sticky cart button (mobile) */}
      {totalItems > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20 px-4">
          <button
            onClick={() => setShowCart(true)}
            className="bg-[#C7A17A] hover:bg-[#B58E62] text-white font-bold px-8 py-4 rounded-2xl shadow-xl text-base transition-colors flex items-center gap-3"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems} Artikel · {formatEur(totalCents)}
            {showDiscount && (
              <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                -{discountInfo!.pct}%
              </span>
            )}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          style={{ zIndex: 60 }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-xl font-light"
            aria-label="Schließen"
          >
            ✕
          </button>
          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            style={{
              animation: 'lightboxIn 0.2s ease-out',
            }}
          />
          {/* Caption */}
          <p className="absolute bottom-6 left-0 right-0 text-center text-white font-semibold text-sm drop-shadow">
            {lightbox.alt}
          </p>
          <style>{`
            @keyframes lightboxIn {
              from { opacity: 0; transform: scale(0.92); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
