import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/bizzn-pass/verify
 *
 * Wird nach dem Stripe-Checkout-Callback aufgerufen.
 * Prüft, ob der Customer eine aktive Subscription hat,
 * und schreibt sie in die DB (falls der Webhook noch nicht kam).
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })

  const admin = createAdminClient()
  const stripe = getStripe()

  // Bereits aktiv in DB?
  const { data: existing } = await admin
    .from('bizzn_pass_subscriptions')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ hasPass: true, status: existing.status })
  }

  // Stripe Customer für diesen User finden
  const customers = await stripe.customers.list({
    email: user.email!,
    limit: 5,
  })

  for (const customer of customers.data) {
    // Aktive Subscriptions dieses Customers
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 5,
    })

    for (const sub of subs.data) {
      // Prüfen ob es ein Bizzn-Pass Abo ist (gleiche Price ID)
      const priceId = process.env.STRIPE_BIZZN_PASS_PRICE_ID
      const isBizznPass = sub.items.data.some(item => item.price.id === priceId)
      if (!isBizznPass) continue

      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null

      // In DB einfügen — erst versuchen ob schon vorhanden
      const { data: existingSub } = await admin
        .from('bizzn_pass_subscriptions')
        .select('id')
        .eq('stripe_subscription_id', sub.id)
        .maybeSingle()

      if (existingSub) {
        await admin.from('bizzn_pass_subscriptions')
          .update({ status: sub.status, current_period_end: periodEnd, cancel_at_period_end: sub.cancel_at_period_end })
          .eq('id', existingSub.id)
      } else {
        await admin.from('bizzn_pass_subscriptions').insert({
          user_id: user.id,
          stripe_customer_id: customer.id,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end,
        })
      }

      return NextResponse.json({
        hasPass: true,
        status: sub.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      })
    }
  }

  return NextResponse.json({ hasPass: false })
}
