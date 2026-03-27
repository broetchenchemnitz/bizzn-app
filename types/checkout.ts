/**
 * Checkout types — Bizzn.de
 */

export interface CartItem {
  id: string
  name: string
  price: number      // in cents
  quantity: number
  description?: string
}

export interface CheckoutSession {
  projectId: string
  slug: string
  cart: CartItem[]
  tableNumber?: string
  orderType: 'delivery' | 'pickup' | 'dine-in'
}
