'use server'

import { signUpCustomer, signInCustomer, getCustomerSession, checkNoShowBlacklist } from '@/app/actions/customer'
import { placeOrder, type CartItem } from '@/app/[domain]/actions'

export interface CheckoutInput {
  mode: 'register' | 'login' | 'existing'
  projectId: string
  // Auth fields (not needed for 'existing')
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  phone?: string
  // Order fields
  items: CartItem[]
  orderType: 'delivery' | 'takeaway' | 'in-store'
  deliveryAddress?: string
  tableNumber?: string
  // M24: Abholzeit-Slot
  pickupSlot?: string
  // M26: Zahlungsart ('cash' = Barzahlung, 'card' = Online-Zahlung per Stripe)
  paymentMode?: 'cash' | 'card'
}

export interface CheckoutResult {
  orderId: string | null
  error: string | null
}

/**
 * Kombinierte Server Action: Auth + Bestellung in einem Schritt.
 * Vermeidet Cookie-Synchronisations-Probleme zwischen separaten Aufrufen.
 */
export async function checkoutWithAuth(input: CheckoutInput): Promise<CheckoutResult> {
  const { mode, projectId, items, orderType, deliveryAddress, tableNumber } = input

  let resolvedUserId: string | null = null

  // ── 1. Auth (falls nicht bereits eingeloggt) ──────────────────────────────
  if (mode === 'register') {
    if (!input.firstName || !input.lastName || !input.email || !input.password) {
      return { orderId: null, error: 'Bitte fülle alle Pflichtfelder aus.' }
    }
    const authResult = await signUpCustomer({
      projectId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
      phone: input.phone,
      consentPush: true,
      consentEmail: false,
    })
    if ('error' in authResult) {
      return { orderId: null, error: authResult.error }
    }
    resolvedUserId = authResult.userId
  } else if (mode === 'login') {
    if (!input.email || !input.password) {
      return { orderId: null, error: 'Bitte E-Mail und Passwort eingeben.' }
    }
    const authResult = await signInCustomer({
      projectId,
      email: input.email,
      password: input.password,
    })
    if ('error' in authResult) {
      return { orderId: null, error: authResult.error }
    }
    resolvedUserId = authResult.userId
  }

  // ── 2. Session lesen (jetzt gesetzt) ─────────────────────────────────────
  const session = await getCustomerSession()
  resolvedUserId = resolvedUserId || session.userId
  
  if (!resolvedUserId) {
    return { orderId: null, error: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.' }
  }

  const customerName = input.firstName && input.lastName
    ? `${input.firstName} ${input.lastName}`
    : (session.name || session.email?.split('@')[0] || 'Kunde')
  const customerContact = input.phone
    ? input.phone
    : (input.email || session.email || '')

  // ── 3. Restaurant-Level Ban prüfen (serverseitig!) ─────────────────────────
  {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: banCheck } = await admin
      .from('restaurant_customers')
      .select('is_banned, ban_reason')
      .eq('project_id', projectId)
      .eq('user_id', resolvedUserId)
      .maybeSingle()

    if (banCheck?.is_banned) {
      return { orderId: null, error: `🚫 Du bist für Bestellungen bei diesem Restaurant gesperrt.${banCheck.ban_reason ? ` Grund: ${banCheck.ban_reason}` : ''}` }
    }
  }

  // ── 3b. Anti-Fraud: Erstbesteller-Rabatt Missbrauchs-Prüfung ────────────────
  // Harte Sperre: Blockiert Bestellung komplett bei starkem Fraud-Signal.
  // (Ergänzt den weichen Check in placeOrder, der den Rabatt nur still überspringt.)
  if (resolvedUserId) {
    const { createClient: createFraudAdmin } = await import('@supabase/supabase-js')
    const fraudAdmin = createFraudAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Nur prüfen wenn Restaurant Willkommensrabatt aktiviert hat
    const { data: discountProject } = await fraudAdmin
      .from('projects')
      .select('welcome_discount_enabled, welcome_discount_pct')
      .eq('id', projectId)
      .single()

    if (discountProject?.welcome_discount_enabled && discountProject.welcome_discount_pct > 0) {
      // Ist dieser User ein Erstbesteller bei diesem Restaurant?
      const { count: existingOrders } = await fraudAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('user_id', resolvedUserId)
        .neq('payment_status', 'failed')

      if ((existingOrders ?? 0) === 0) {
        let fraudReason: string | null = null

        // ── Signal 1: Telefonnummer bei anderem Account mit Rabatt ─────────
        const rawPhone = input.phone ?? customerContact
        const normalizedPhone = rawPhone.replace(/[\s\-()]/g, '')

        if (!fraudReason && normalizedPhone.length >= 6) {
          // Andere Profile mit gleicher Telefonnummer suchen
          const { data: phoneDupes } = await fraudAdmin
            .from('customer_profiles')
            .select('id')
            .neq('id', resolvedUserId)
            .eq('phone', rawPhone)
            .limit(5)

          if (phoneDupes && phoneDupes.length > 0) {
            // Hat einer dieser Accounts schon Rabatt bei diesem Restaurant bekommen?
            const { count: discountedOrders } = await fraudAdmin
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', projectId)
              .in('user_id', phoneDupes.map(d => d.id))
              .gt('discount_pct', 0)

            if ((discountedOrders ?? 0) > 0) {
              fraudReason = 'phone-reuse'
            }
          }
        }

        // ── Signal 2: Name + Lieferadresse Kombination ────────────────────
        if (!fraudReason && customerName && deliveryAddress?.trim()) {
          // Alle Rabatt-Bestellungen an gleiche Adresse (case-insensitive) holen
          const { data: addrOrders } = await fraudAdmin
            .from('orders')
            .select('customer_name, user_id')
            .eq('project_id', projectId)
            .neq('user_id', resolvedUserId)
            .gt('discount_pct', 0)
            .ilike('delivery_address', deliveryAddress.trim())
            .limit(20)

          if (addrOrders && addrOrders.length > 0) {
            const currNameNorm = customerName.trim().toLowerCase()
            const currLastName = currNameNorm.split(/\s+/).pop() ?? ''

            for (const prev of addrOrders) {
              const prevNameNorm = (prev.customer_name ?? '').trim().toLowerCase()
              const prevLastName = prevNameNorm.split(/\s+/).pop() ?? ''

              // Exakter Name-Match ODER gleicher Nachname (mind. 2 Zeichen)
              if (
                prevNameNorm === currNameNorm ||
                (currLastName.length >= 2 && currLastName === prevLastName)
              ) {
                fraudReason = 'name+address'
                break
              }
            }
          }
        }

        if (fraudReason) {
          console.warn(`[anti-fraud/checkout] BLOCKED (${fraudReason}) user=${resolvedUserId} project=${projectId}`)
          return {
            orderId: null,
            error: '🚫 Diese Bestellung konnte nicht verarbeitet werden. Der Willkommensrabatt ist pro Haushalt nur einmal einlösbar. Bei Fragen wende dich bitte direkt an das Restaurant.',
          }
        }
      }
    }
  }

  // ── 4. M26: Barzahler-Schutz ──────────────────────────────────────────────
  if (resolvedUserId && !input.paymentMode) {
    const blacklistReason = await checkNoShowBlacklist(resolvedUserId)
    if (blacklistReason) {
      return { orderId: null, error: `🚫 ${blacklistReason}` }
    }
  }

  // ── 5. Bestellung aufgeben ────────────────────────────────────────────────
  return placeOrder({
    projectId,
    customerName,
    customerContact,
    orderType,
    items,
    deliveryAddress,
    tableNumber,
    pickupSlot: input.pickupSlot,
    overrideUserId: resolvedUserId,
    paymentMode: input.paymentMode,
  })
}

/**
 * Gibt die aktuelle Kunden-Session zurück (für Client-Komponenten via Server Action).
 */
export { getCustomerSession }

/**
 * Prüft Zahlungsbeschränkungen für einen Kunden bei einem Projekt.
 * Wird vom Checkout-UI genutzt um Bar-Button zu steuern und Hinweise anzuzeigen.
 */
export async function getPaymentRestrictions(projectId: string): Promise<{
  isFirstOrder: boolean
  isBlacklisted: boolean
  blacklistReason: string | null
  cashLimitCents: number
  isBanned: boolean
  banReason: string | null
}> {
  const session = await getCustomerSession()
  if (!session.userId) {
    // Nicht eingeloggt = Erstbesteller
    return { isFirstOrder: true, isBlacklisted: false, blacklistReason: null, cashLimitCents: 3000, isBanned: false, banReason: null }
  }

  const { getCashOrderCount, checkNoShowBlacklist } = await import('@/app/actions/customer')

  // Parallel laden
  const [cashCount, blacklistReason] = await Promise.all([
    getCashOrderCount(session.userId),
    checkNoShowBlacklist(session.userId),
  ])

  // Cash-Limit + Ban-Check aus DB laden
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: project } = await admin
    .from('projects')
    .select('cash_limit_first_order_cents')
    .eq('id', projectId)
    .single()

  // Erstbesteller-Prüfung
  const { count: orderCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('user_id', session.userId)
    .neq('payment_status', 'failed')

  // Pro-Restaurant Ban prüfen (robust gegen fehlende Ban-Spalten)
  let rcRow: { is_banned?: boolean; ban_reason?: string | null } | null = null
  const { data: rcData, error: rcError } = await admin
    .from('restaurant_customers')
    .select('is_banned, ban_reason')
    .eq('project_id', projectId)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (!rcError) rcRow = rcData

  return {
    isFirstOrder: (orderCount ?? 0) === 0,
    isBlacklisted: !!blacklistReason,
    blacklistReason,
    cashLimitCents: project?.cash_limit_first_order_cents ?? 3000,
    isBanned: rcRow?.is_banned ?? false,
    banReason: rcRow?.ban_reason ?? null,
  }
}
