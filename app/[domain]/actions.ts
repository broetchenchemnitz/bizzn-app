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

// ─── M16: Erstbesteller-Prüfung ──────────────────────────────────────────────

/**
 * Prüft ob der Kunde (identifiziert via customerContact) Erstbesteller ist.
 * Fallback: immer false wenn kein Kontakt angegeben — kein Rabatt ohne Identifikation.
 */
async function isFirstTimeCustomer(
  supabase: ReturnType<typeof createAnonSupabase>,
  projectId: string,
  customerContact: string
): Promise<boolean> {
  if (!customerContact.trim()) return false

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('customer_contact', customerContact.trim())

  return (count ?? 0) === 0
}

export async function placeOrder(
  input: PlaceOrderInput
): Promise<{ orderId: string | null; error: string | null }> {
  const { projectId, customerName, customerContact, orderType, tableNumber, items } = input

  if (!items.length) return { orderId: null, error: 'Warenkorb ist leer.' }

  const subtotalCents = items.reduce(
    (sum, i) => sum + i.priceInCents * i.quantity,
    0
  )

  const supabase = createAnonSupabase()

  // ── M16: Projekt-Rabatteinstellungen lesen ───────────────────────────────
  const { data: project } = await supabase
    .from('projects')
    .select('welcome_discount_enabled, welcome_discount_pct')
    .eq('id', projectId)
    .single()

  let discountPct = 0
  let discountAmountCents = 0

  if (project?.welcome_discount_enabled && project.welcome_discount_pct > 0) {
    const isFirst = await isFirstTimeCustomer(supabase, projectId, customerContact)
    if (isFirst) {
      discountPct = project.welcome_discount_pct
      discountAmountCents = Math.round(subtotalCents * discountPct / 100)
    }
  }

  const totalAmount = subtotalCents - discountAmountCents

  // Insert order
  const orderInsert: OrderInsert = {
    project_id: projectId,
    status: 'pending',
    total_amount: totalAmount,
    customer_name: customerName,
    customer_contact: customerContact,
    order_type: orderType,
    table_number: tableNumber ?? null,
    discount_pct: discountPct,
    discount_amount_cents: discountAmountCents,
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

// ─── M16: Rabatt-Info für den Storefront laden ────────────────────────────────

export interface DiscountInfo {
  enabled: boolean
  pct: number
}

export async function getProjectDiscountInfo(projectId: string): Promise<DiscountInfo> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('projects')
    .select('welcome_discount_enabled, welcome_discount_pct')
    .eq('id', projectId)
    .single()

  return {
    enabled: data?.welcome_discount_enabled ?? false,
    pct: data?.welcome_discount_pct ?? 10,
  }
}
