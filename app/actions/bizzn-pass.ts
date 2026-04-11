'use server'

import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export interface BizznPassInfo {
  hasPass: boolean
  status: string | null           // 'active' | 'trialing' | 'past_due' | 'canceled' | null
  currentPeriodEnd: string | null // ISO timestamp
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
}

/**
 * Gibt den Bizzn-Pass-Status des eingeloggten Kunden zurück.
 * Für mein-konto → Abo-Tab.
 */
export async function getMyBizznPass(): Promise<BizznPassInfo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { hasPass: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, stripeCustomerId: null }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('bizzn_pass_subscriptions')
    .select('status, current_period_end, cancel_at_period_end, stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return { hasPass: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, stripeCustomerId: null }
  }

  const isActive = (data.status === 'active' || data.status === 'trialing') &&
    (!data.current_period_end || new Date(data.current_period_end) > new Date())

  return {
    hasPass: isActive,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    stripeCustomerId: data.stripe_customer_id,
  }
}

/**
 * Schneller boolean-Check: Hat der Kunden einen aktiven Bizzn-Pass?
 * Wird in placeOrder und Checkout verwendet.
 * Nutzt die SQL-Funktion has_active_bizzn_pass().
 */
export async function hasBizznPass(userId: string): Promise<boolean> {
  if (!userId) return false

  const admin = createAdminClient()
  const { data } = await admin
    .rpc('has_active_bizzn_pass', { p_user_id: userId })

  return data === true
}
