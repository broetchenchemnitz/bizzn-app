'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import type { Database } from '@/types/supabase'

/**
 * No-Show melden: Markiert die Bestellung als no_show und sperrt den Kunden für Barzahlung.
 * Nur vom Gastronom (Projekt-Owner) aufrufbar.
 */
export async function reportNoShow(orderId: string): Promise<{ success: boolean; error?: string }> {
  if (!orderId) return { success: false, error: 'Keine Bestellung angegeben.' }

  // ── Auth Guard: Session prüfen ──────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert.' }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Bestellung laden (inkl. total_amount für Loyalty-Rückbuchung)
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, user_id, project_id, no_show, total_amount, discount_amount_cents')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return { success: false, error: 'Bestellung nicht gefunden.' }
  }

  // ── Ownership-Check: Bestellung muss zu einem Projekt des Users gehören ─────
  const { data: ownedProject } = await supabase
    .from('projects')
    .select('id')
    .eq('id', order.project_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownedProject) {
    return { success: false, error: 'Keine Berechtigung für diese Bestellung.' }
  }

  if (order.no_show) {
    return { success: false, error: 'Bereits als No-Show markiert.' }
  }

  // 2. Bestellung als No-Show markieren
  const { error: updateError } = await admin
    .from('orders')
    .update({ no_show: true })
    .eq('id', orderId)

  if (updateError) {
    console.error('reportNoShow update order error:', updateError)
    return { success: false, error: 'Fehler beim Markieren.' }
  }

  // 3. Loyalty-Gutschrift rückgängig machen
  if (order.user_id && order.project_id) {
    try {
      // Aktuelles Loyalty-Guthaben laden
      const { data: loyalty } = await admin
        .from('loyalty_balances')
        .select('balance_cents, order_count')
        .eq('user_id', order.user_id)
        .eq('project_id', order.project_id)
        .single()

      if (loyalty) {
        // Gutschrift berechnen die rückgängig gemacht werden muss (5% Standard, 10% Bizzn-Pass)
        // Sicherheitshalber mit 10% rechnen (Maximum)
        const orderSubtotal = (order.total_amount ?? 0) + (order.discount_amount_cents ?? 0)
        const maxCredit = Math.round(orderSubtotal * 0.10)
        const minCredit = Math.round(orderSubtotal * 0.05)
        
        // Prüfen welcher Betrag plausibel ist
        const creditToReverse = (loyalty.balance_cents >= maxCredit) ? maxCredit : minCredit

        const newBalance = Math.max(0, loyalty.balance_cents - creditToReverse)
        const newCount = Math.max(0, (loyalty.order_count ?? 1) - 1)

        await admin
          .from('loyalty_balances')
          .update({
            balance_cents: newBalance,
            order_count: newCount,
          })
          .eq('user_id', order.user_id)
          .eq('project_id', order.project_id)
      }
    } catch (err) {
      console.error('reportNoShow loyalty reversal error:', err)
      // Kein harter Fehler — No-Show ist trotzdem markiert
    }
  }

  // 4. Kunden für Barzahlung sperren (wenn userId vorhanden)
  if (order.user_id) {
    const { error: blacklistError } = await admin
      .from('customer_profiles')
      .update({
        is_blacklisted: true,
        blacklist_reason: 'No-Show: Bestellung nicht abgeholt.',
        blacklisted_at: new Date().toISOString(),
      })
      .eq('id', order.user_id)

    if (blacklistError) {
      console.error('reportNoShow blacklist error:', blacklistError)
      // Kein harter Fehler — die Bestellung ist trotzdem markiert
    }
  }

  return { success: true }
}
