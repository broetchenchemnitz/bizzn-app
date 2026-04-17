import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

/**
 * GET /api/bizzn-pass/status
 *
 * Gibt den aktuellen Bizzn-Pass-Status des eingeloggten Kunden zurück.
 * Synchronisiert bei jedem Aufruf mit Stripe, um Kündigungen sofort anzuzeigen.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('bizzn_pass_subscriptions')
    .select('id, stripe_subscription_id, status, current_period_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({
      hasPass: false,
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
  }

  // Live-Sync mit Stripe
  let stripeStatus = data.status
  let stripePeriodEnd = data.current_period_end
  let stripeCancelAtEnd = data.cancel_at_period_end

  try {
    const stripe = getStripe()
    const sub = await stripe.subscriptions.retrieve(data.stripe_subscription_id) as any

    stripeStatus = sub.status

    // Stripe API v2: current_period_end kann fehlen, cancel_at ist gesetzt bei Kündigung
    const cancelAt = sub.cancel_at // Unix timestamp (Sekunden) — Abo wird zu diesem Datum beendet
    const periodEnd = sub.current_period_end // Kann undefined sein in neueren API-Versionen

    // Kündigung erkennen: cancel_at gesetzt ODER cancel_at_period_end
    const isCancelled = !!cancelAt || sub.cancel_at_period_end
    const endDate = cancelAt
      ? new Date(cancelAt * 1000).toISOString()
      : periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null

    stripeCancelAtEnd = isCancelled
    stripePeriodEnd = endDate

    // DB aktualisieren
    if (
      stripeStatus !== data.status ||
      stripePeriodEnd !== data.current_period_end ||
      stripeCancelAtEnd !== data.cancel_at_period_end
    ) {
      await admin
        .from('bizzn_pass_subscriptions')
        .update({
          status: stripeStatus,
          current_period_end: stripePeriodEnd,
          cancel_at_period_end: stripeCancelAtEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)

      console.log('Bizzn-Pass status synced from Stripe:', {
        status: stripeStatus,
        cancelAtPeriodEnd: stripeCancelAtEnd,
        currentPeriodEnd: stripePeriodEnd,
        cancelAt,
      })
    }
  } catch (err) {
    console.error('Failed to sync Bizzn-Pass from Stripe:', err)
  }

  const isActive = (stripeStatus === 'active' || stripeStatus === 'trialing') &&
    (!stripePeriodEnd || new Date(stripePeriodEnd) > new Date())

  return NextResponse.json({
    hasPass: isActive,
    status: stripeStatus,
    currentPeriodEnd: stripePeriodEnd,
    cancelAtPeriodEnd: stripeCancelAtEnd,
  })
}
