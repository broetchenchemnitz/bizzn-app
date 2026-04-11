'use server'

import { signUpCustomer, signInCustomer, getCustomerSession, checkNoShowBlacklist } from '@/app/actions/customer'
import { placeOrder, type CartItem } from '@/app/[domain]/actions'

export interface CheckoutInput {
  mode: 'register' | 'login' | 'existing' | 'anonymous'
  projectId: string
  // Auth fields (not needed for 'existing' or 'anonymous')
  name?: string
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
    if (!input.name || !input.email || !input.password) {
      return { orderId: null, error: 'Bitte fülle alle Pflichtfelder aus.' }
    }
    const authResult = await signUpCustomer({
      projectId,
      name: input.name,
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
  
  if (mode !== 'anonymous' && !resolvedUserId) {
    return { orderId: null, error: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.' }
  }

  const customerName = input.name || session.name || session.email?.split('@')[0] || `Gast (Tisch ${tableNumber})`
  const customerContact = input.email || session.email || ''

  // ── 4. M26: Barzahler-Schutz ──────────────────────────────────────────────
  //    Nur für nicht-anonyme Barzahler (Abholung/Lieferung ohne Online-Zahlung)
  // Payment-Mode wird vom Client mitgeschickt (fehlt noch im Input) — wir prüfen
  // anhand des Fehlens von payment_intent_id, ob Bar gewählt wurde.
  // Für Bestellungen ohne paymentMode (= Barzahlung) greifen die Schutzregeln:
  if (resolvedUserId && !input.paymentMode) {
    // 4a. Blacklist-Check
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
    overrideUserId: resolvedUserId ?? undefined,
  })
}

/**
 * Gibt die aktuelle Kunden-Session zurück (für Client-Komponenten via Server Action).
 */
export { getCustomerSession }
