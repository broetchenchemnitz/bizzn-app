"use client"

import { useState, useTransition } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, Loader2, CheckCircle2, ChefHat } from 'lucide-react'
import { placeOrder, type CartItem } from '@/app/[domain]/actions'
import type { Database } from '@/types/supabase'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

interface MenuBoardProps {
  projectId: string
  projectName: string
  categories: (MenuCategory & { menu_items: MenuItem[] })[]
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function MenuBoard({ projectId, projectName, categories }: MenuBoardProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery' | 'in-store'>('takeaway')
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [isPending, startTransition] = useTransition()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const totalCents = cart.reduce((s, i) => s + i.priceInCents * i.quantity, 0)

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
    startTransition(async () => {
      const result = await placeOrder({
        projectId,
        customerName: customerName.trim(),
        customerContact: customerContact.trim(),
        orderType,
        items: cart,
      })
      if (result.error) {
        setFormError(result.error)
      } else {
        setOrderId(result.orderId)
        setCart([])
      }
    })
  }

  // --- Order confirmed screen ---
  if (orderId) {
    return (
      <div className="min-h-screen bg-[#F0FBD8] flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-[#77CC00] mb-6" />
        <h1 className="text-3xl font-extrabold text-[#1A1A1A] mb-2">Bestellung eingegangen!</h1>
        <p className="text-gray-600 mb-4">Wir bereiten deine Bestellung vor.</p>
        <p className="text-xs text-gray-400 font-mono bg-white px-4 py-2 rounded-lg border border-gray-200">
          #{orderId.slice(0, 8).toUpperCase()}
        </p>
        <button
          onClick={() => setOrderId(null)}
          className="mt-8 text-sm text-[#4a8500] underline"
        >
          Neue Bestellung aufgeben
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77CC00] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#1A1A1A] text-base leading-none">{projectName}</p>
              <p className="text-xs text-gray-400">Digitale Speisekarte · bizzn</p>
            </div>
          </div>
          {totalItems > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 bg-[#77CC00] hover:bg-[#66b300] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{totalItems}</span>
              <span className="hidden sm:inline">· {formatEur(totalCents)}</span>
            </button>
          )}
        </div>
      </header>

      {/* Menu */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-10 pb-32">
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 py-20">Speisekarte wird vorbereitet…</p>
        ) : (
          categories.map((cat) => (
            <section key={cat.id}>
              <h2 className="text-lg font-extrabold text-[#1A1A1A] mb-4 pb-2 border-b border-gray-200">
                {cat.name}
              </h2>
              <div className="space-y-3">
                {cat.menu_items.filter((i) => i.is_active).map((item) => {
                  const inCart = cart.find((c) => c.menuItemId === item.id)
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1A1A1A]">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <p className="text-sm font-bold text-[#77CC00] mt-1">
                          {formatEur(item.price)}
                        </p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => changeQty(item.id, -1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => changeQty(item.id, 1)}
                            className="w-8 h-8 rounded-lg bg-[#77CC00] hover:bg-[#66b300] text-white flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="shrink-0 w-9 h-9 rounded-xl bg-[#F0FBD8] hover:bg-[#77CC00] hover:text-white text-[#77CC00] flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-4">Deine Bestellung</h2>

            {/* Cart items */}
            <div className="space-y-3 mb-6">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} × {formatEur(item.priceInCents)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#1A1A1A] tabular-nums">
                    {formatEur(item.priceInCents * item.quantity)}
                  </p>
                  <button onClick={() => changeQty(item.menuItemId, -item.quantity)}>
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 mb-6 flex justify-between font-extrabold text-lg">
              <span>Gesamt</span>
              <span className="text-[#77CC00]">{formatEur(totalCents)}</span>
            </div>

            {/* Checkout form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order type */}
              <div className="grid grid-cols-3 gap-2">
                {(['takeaway', 'delivery', 'in-store'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      orderType === type
                        ? 'bg-[#77CC00] border-[#66b300] text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#77CC00]'
                    }`}
                  >
                    {type === 'takeaway' ? '🛍️ Abholung' : type === 'delivery' ? '🛵 Lieferung' : '📱 Vor Ort'}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Dein Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#77CC00]"
                required
              />
              <input
                type="text"
                placeholder="Telefon / E-Mail (optional)"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#77CC00]"
              />

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <button
                type="submit"
                disabled={isPending || cart.length === 0}
                className="w-full bg-[#77CC00] hover:bg-[#66b300] disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                {isPending ? 'Wird gesendet…' : `Jetzt bestellen · ${formatEur(totalCents)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sticky cart button (mobile) */}
      {totalItems > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20 px-4">
          <button
            onClick={() => setShowCart(true)}
            className="bg-[#77CC00] hover:bg-[#66b300] text-white font-bold px-8 py-4 rounded-2xl shadow-xl text-base transition-colors flex items-center gap-3"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems} Artikel · {formatEur(totalCents)}
          </button>
        </div>
      )}
    </div>
  )
}
