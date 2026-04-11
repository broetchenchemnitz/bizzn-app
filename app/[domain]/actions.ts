'use server'

import { createClient } from '@supabase/supabase-js'
import { createCustomerSupabase, getCustomerSession } from '@/app/actions/customer'
import type { Database } from '@/types/supabase'

type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']

function createAnonSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Service-Role-Client: Bypasses RLS — nur server-seitig verwenden!
function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  deliveryAddress?: string
  deliveryFeeCents?: number
  overrideUserId?: string
  // M24: Abholzeit-Slot
  pickupSlot?: string
}

// ─── M16: Erstbesteller-Prüfung ──────────────────────────────────────────────

/**
 * Prüft ob der Kunde (via user_id) Erstbesteller bei diesem Restaurant ist.
 * Verwendet Service Role um RLS zu umgehen — Kunden können ihre eigenen Orders nicht lesen.
 */
async function isFirstTimeCustomer(
  projectId: string,
  userId: string
): Promise<boolean> {
  if (!userId) return false

  const admin = createAdminClient()
  const { count } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('user_id', userId)

  return (count ?? 0) === 0
}

export async function placeOrder(
  input: PlaceOrderInput
): Promise<{ orderId: string | null; error: string | null }> {
  const { projectId, customerName, orderType, tableNumber, items, deliveryAddress, overrideUserId, pickupSlot } = input
  
  // Kontakt normalisieren: lowercase + trim verhindert Manipulation via Groß-/Kleinschreibung
  const customerContact = input.customerContact.trim().toLowerCase()
  const customerName_clean = customerName.trim()

  if (!items.length) return { orderId: null, error: 'Warenkorb ist leer.' }
  if (!customerName_clean) return { orderId: null, error: 'Bitte gib deinen Namen ein.' }
  // Lieferadresse Pflicht bei Lieferbestellung
  if (orderType === 'delivery' && !deliveryAddress?.trim()) {
    return { orderId: null, error: 'Bitte gib eine Lieferadresse an.' }
  }

  const subtotalCents = items.reduce(
    (sum, i) => sum + i.priceInCents * i.quantity,
    0
  )

  const supabase = await createCustomerSupabase()
  const session = await getCustomerSession()
  const finalUserId = overrideUserId || session.userId
  
  if (!finalUserId && !tableNumber) {
    return { orderId: null, error: 'Bitte melde dich an, um eine Bestellung aufzugeben.' }
  }

  // ── M16: Projekt-Rabatteinstellungen + M19: Liefergebühr lesen ─────────────
  const { data: project } = await supabase
    .from('projects')
    .select('welcome_discount_enabled, welcome_discount_pct, delivery_fee_cents, min_order_cents, delivery_enabled, free_delivery_above_cents, loyalty_enabled')
    .eq('id', projectId)
    .single()

  let discountPct = 0
  let discountAmountCents = 0

  if (project?.welcome_discount_enabled && project.welcome_discount_pct > 0 && session.userId) {
    const isFirst = await isFirstTimeCustomer(projectId, session.userId)
    if (isFirst) {
      discountPct = project.welcome_discount_pct
      discountAmountCents = Math.round(subtotalCents * discountPct / 100)
    }
  }

  // M19: Liefergebühr — Server-seitig aus project lesen (nicht dem Client vertrauen)
  let finalDeliveryFeeCents = 0
  if (orderType === 'delivery') {
    const rawFee = project?.delivery_fee_cents ?? 0
    const freeAbove = project?.free_delivery_above_cents ?? 0
    // Gratislieferung ab Schwellenwert
    finalDeliveryFeeCents = (freeAbove > 0 && subtotalCents >= freeAbove) ? 0 : rawFee
  }

  const totalAmount = subtotalCents - discountAmountCents + finalDeliveryFeeCents

  // ── M23: Loyalty — Vorgezogene Einlösung prüfen ───────────────────────────
  // Nur wenn Loyalty aktiviert ist + Kunde eingeloggt
  let loyaltySpentCents = 0
  let loyaltyBalance = 0
  let loyaltyOrderCount = 0
  let shouldRedeemLoyalty = false

  if (project?.loyalty_enabled && session.userId) {
    const admin = createAdminClient()
    const { data: lb } = await admin
      .from('loyalty_balances')
      .select('balance_cents, order_count, last_order_at')
      .eq('user_id', session.userId)
      .eq('project_id', projectId)
      .single()

    if (lb) {
      loyaltyBalance = lb.balance_cents
      loyaltyOrderCount = lb.order_count

      // 90-Tage-Verfall: Guthaben auf 0 setzen wenn zu lange inaktiv
      if (lb.last_order_at) {
        const daysSinceLast = (Date.now() - new Date(lb.last_order_at).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLast > 90) {
          loyaltyBalance = 0
          loyaltyOrderCount = 0
        }
      }

      // 6. Bestellung = Einlösung (nach dem Increment wird es 6)
      if ((loyaltyOrderCount + 1) >= 6 && loyaltyBalance > 0) {
        shouldRedeemLoyalty = true
        loyaltySpentCents = Math.min(loyaltyBalance, totalAmount)
      }
    }
  }

  const finalTotalAmount = totalAmount - loyaltySpentCents

  // Insert order
  const orderInsert: OrderInsert = {
    project_id: projectId,
    user_id: finalUserId,
    status: 'pending',
    total_amount: finalTotalAmount,
    customer_name: customerName_clean,
    customer_contact: customerContact,
    order_type: orderType,
    table_number: tableNumber ?? null,
    discount_pct: discountPct,
    discount_amount_cents: discountAmountCents,
    delivery_address: orderType === 'delivery' ? (deliveryAddress?.trim() ?? null) : null,
    delivery_fee_cents: finalDeliveryFeeCents,
    loyalty_spent_cents: loyaltySpentCents,
    // M24: Abholzeit-Slot
    pickup_slot: pickupSlot ?? null,
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
    item_name: item.name,
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

  // ── M23: Loyalty-Guthaben aktualisieren ──────────────────────────────────
  if (project?.loyalty_enabled && session.userId) {
    const admin = createAdminClient()
    // Gutschrift = 10 % des Warenkorb-Werts (ohne Liefergebühr, nach Rabatt)
    const creditCents = Math.round((subtotalCents - discountAmountCents) * 0.10)

    const newOrderCount = shouldRedeemLoyalty ? 0 : (loyaltyOrderCount + 1)
    const newBalance = shouldRedeemLoyalty
      ? creditCents  // Reset + erste Gutschrift nach Einlösung
      : loyaltyBalance + creditCents

    await admin
      .from('loyalty_balances')
      .upsert(
        {
          user_id: session.userId,
          project_id: projectId,
          balance_cents: newBalance,
          order_count: newOrderCount,
          last_order_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,project_id' }
      )
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

// ─── M19: Liefergebühr-Info für den Storefront laden ──────────────────────────

export interface DeliveryInfo {
  enabled: boolean
  feeCents: number
  minOrderCents: number
  freeAboveCents: number
}

export async function getDeliveryInfo(projectId: string): Promise<DeliveryInfo> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('projects')
    .select('delivery_enabled, delivery_fee_cents, min_order_cents, free_delivery_above_cents')
    .eq('id', projectId)
    .single()

  return {
    enabled: data?.delivery_enabled ?? true,
    feeCents: data?.delivery_fee_cents ?? 0,
    minOrderCents: data?.min_order_cents ?? 0,
    freeAboveCents: data?.free_delivery_above_cents ?? 0,
  }
}

// ─── M26: No-Show melden (Gastronom-Action) ───────────────────────────────────

/**
 * Markiert eine Bestellung als No-Show und sperrt den Kunden für Barzahlung
 * nach dem 1-Strike-Prinzip. Nur Gastronomen können diese Action aufrufen
 * (Server-seitig via Service Role — nach Auth-Check auf project ownership).
 */
export async function markNoShow(orderId: string, projectId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient()

  // 1. Bestellung laden + project-ownership prüfen
  const { data: order, error: fetchErr } = await admin
    .from('orders')
    .select('id, user_id, order_type, payment_status, project_id')
    .eq('id', orderId)
    .eq('project_id', projectId)
    .single()

  if (fetchErr || !order) {
    return { error: 'Bestellung nicht gefunden.' }
  }

  // 2. Bestellung als No-Show markieren
  await admin.from('orders').update({ no_show: true }).eq('id', orderId)

  // 3. Wenn Bestellung einem registrierten Kunden gehört → Blacklist-Logik
  const userId = order.user_id
  if (userId) {
    // Nur bei Barzahlern blacklisten (Online-Bezahlte sind bereits gesichert)
    const isCashOrder = !order.payment_status || order.payment_status === 'pending'

    if (isCashOrder) {
      // Aktuellen Zähler lesen
      const { data: profile } = await admin
        .from('customer_profiles')
        .select('cash_order_count, is_blacklisted')
        .eq('id', userId)
        .single()

      if (profile && !profile.is_blacklisted) {
        // 1-Strike-Prinzip: direkt sperren
        await admin
          .from('customer_profiles')
          .update({
            is_blacklisted: true,
            blacklist_reason: 'Bestellung nicht abgeholt (No-Show). Bitte kontaktiere das Restaurant, um dein Konto wieder freizuschalten.',
            blacklisted_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }
    }
  }

  return { error: null }
}

/**
 * Entsperrt einen Kunden (Gastronom-Action).
 */
export async function unblacklistCustomer(userId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('customer_profiles')
    .update({
      is_blacklisted: false,
      blacklist_reason: null,
      blacklisted_at: null,
    })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

/**
 * Liest die Blacklist eines Restaurants (Kunden, die mindestens eine No-Show-Bestellung haben).
 */
export async function getNoShowBlacklist(projectId: string): Promise<{
  userId: string
  name: string | null
  email: string | null
  phone: string | null
  blacklistedAt: string | null
  noShowCount: number
}[]> {
  const admin = createAdminClient()

  // Alle No-Show-Bestellungen dieses Restaurants mit Kunden-Daten
  const { data: orders } = await admin
    .from('orders')
    .select('user_id, created_at')
    .eq('project_id', projectId)
    .eq('no_show', true)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (!orders?.length) return []

  // Eindeutige user_ids + Zähler
  const countMap = new Map<string, number>()
  for (const o of orders) {
    if (o.user_id) countMap.set(o.user_id, (countMap.get(o.user_id) ?? 0) + 1)
  }
  const uniqueIds = Array.from(countMap.keys())

  // Kundenprofil-Daten laden
  const { data: profiles } = await admin
    .from('customer_profiles')
    .select('id, name, phone, is_blacklisted, blacklisted_at')
    .in('id', uniqueIds)

  // Auth-Emails laden
  const emails: Record<string, string> = {}
  for (const uid of uniqueIds) {
    const { data: u } = await admin.auth.admin.getUserById(uid)
    if (u?.user?.email) emails[uid] = u.user.email
  }

  return uniqueIds
    .filter(uid => profiles?.find(p => p.id === uid))
    .map(uid => {
      const p = profiles!.find(pp => pp.id === uid)!
      return {
        userId: uid,
        name: p.name,
        email: emails[uid] ?? null,
        phone: p.phone,
        blacklistedAt: p.is_blacklisted ? (p.blacklisted_at ?? null) : null,
        noShowCount: countMap.get(uid) ?? 0,
      }
    })
    .sort((a, b) => (b.noShowCount - a.noShowCount))
}

