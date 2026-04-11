import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/stripe/bizzn-pass/subscribe
 *
 * Erstellt eine Stripe Subscription für den Bizzn-Pass (4,99 €/Monat).
 * Gibt einen Stripe Payment Intent clientSecret zurück, den das Frontend
 * mit Stripe Payment Element bestätigen kann.
 *
 * Ablauf:
 * 1. Kunden-Session lesen
 * 2. Stripe Customer erstellen/wiederverwenden
 * 3. Subscription erstellen (payment_behavior: 'default_incomplete')
 * 4. clientSecret vom ersten Invoice zurückgeben
 */
export async function POST() {
  // 1. Auth: Nur eingeloggte Kunden können abonnieren
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  const priceId = process.env.STRIPE_BIZZN_PASS_PRICE_ID
  if (!priceId) {
    console.error('[bizzn-pass] STRIPE_BIZZN_PASS_PRICE_ID nicht gesetzt')
    return NextResponse.json({ error: 'Konfigurationsfehler: Preis nicht gefunden.' }, { status: 500 })
  }

  const admin = createAdminClient()
  const stripe = getStripe()

  // 2. Bestehendes Abo prüfen (nur ein aktives Abo pro User)
  const { data: existing } = await admin
    .from('bizzn_pass_subscriptions')
    .select('status, stripe_subscription_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Du hast bereits einen aktiven Bizzn-Pass.' },
      { status: 409 }
    )
  }

  // 3. Stripe Customer ID aus vorherigen (ggf. abgelaufenen) Abos wiederverwenden
  const { data: prevSub } = await admin
    .from('bizzn_pass_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let stripeCustomerId = prevSub?.stripe_customer_id

  if (!stripeCustomerId) {
    // Neuen Stripe Customer anlegen
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    })
    stripeCustomerId = customer.id
  }

  // 4. Subscription erstellen (incomplete → wartet auf Payment-Bestätigung)
  let subscription: import('stripe').default.Subscription
  try {
    subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card', 'paypal'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: user.id },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe-Fehler'
    console.error('[bizzn-pass] subscription.create failed:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 5. clientSecret extrahieren
  const invoice = subscription.latest_invoice as import('stripe').default.Invoice & {
    payment_intent: import('stripe').default.PaymentIntent | null
  }
  const clientSecret = invoice?.payment_intent?.client_secret

  if (!clientSecret) {
    console.error('[bizzn-pass] No clientSecret from subscription invoice', subscription.id)
    return NextResponse.json({ error: 'Zahlung konnte nicht initialisiert werden.' }, { status: 500 })
  }

  // 6. Sub in DB vormerken (status: 'incomplete' — wird via Webhook auf 'active' gesetzt)
  await admin.from('bizzn_pass_subscriptions').insert({
    user_id: user.id,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  })

  return NextResponse.json({
    clientSecret,
    subscriptionId: subscription.id,
  })
}
