'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']

function createAnonSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface CartItem {
  menuItemId: string
  name: string
  priceInCents: number
  quantity: number
}

export interface PlaceOrderInput {
  projectId: string
  customerName: string
  customerContact: string
  orderType: 'delivery' | 'takeaway' | 'in-store'
  tableNumber?: string
  items: CartItem[]
}

export async function placeOrder(
  input: PlaceOrderInput
): Promise<{ orderId: string | null; error: string | null }> {
  const { projectId, customerName, customerContact, orderType, tableNumber, items } = input

  if (!items.length) return { orderId: null, error: 'Warenkorb ist leer.' }

  const totalAmount = items.reduce(
    (sum, i) => sum + i.priceInCents * i.quantity,
    0
  )

  const supabase = createAnonSupabase()

  // Insert order
  const orderInsert: OrderInsert = {
    project_id: projectId,
    status: 'pending',
    total_amount: totalAmount,
    customer_name: customerName,
    customer_contact: customerContact,
    order_type: orderType,
    table_number: tableNumber ?? null,
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderInsert)
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('placeOrder error:', orderError)
    return { orderId: null, error: 'Bestellung konnte nicht gespeichert werden.' }
  }

  // Insert order items
  const itemInserts: OrderItemInsert[] = items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    price_at_time: item.priceInCents,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemInserts)

  if (itemsError) {
    console.error('placeOrder items error:', itemsError)
    return { orderId: null, error: 'Bestellpositionen konnten nicht gespeichert werden.' }
  }

  return { orderId: order.id, error: null }
}
