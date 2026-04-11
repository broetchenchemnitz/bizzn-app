import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/stripe/bizzn-pass/subscribe
 *
 * Erstellt eine Stripe Checkout Session für den Bizzn-Pass (4,99 €/Monat).
 * Gibt die Checkout-URL zurück → Frontend leitet dorthin weiter.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  const priceId = process.env.STRIPE_BIZZN_PASS_PRICE_ID
  if (!priceId) {
    console.error('[bizzn-pass] STRIPE_BIZZN_PASS_PRICE_ID nicht gesetzt')
    return NextResponse.json({ error: 'Konfigurationsfehler.' }, { status: 500 })
  }

  const admin = createAdminClient()
  const stripe = getStripe()

  // Bestehendes aktives Abo prüfen
  const { data: existing } = await admin
    .from('bizzn_pass_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Du hast bereits einen aktiven Bizzn-Pass.' }, { status: 409 })
  }

  // Stripe Customer ID wiederverwenden oder neu anlegen
  const { data: prevSub } = await admin
    .from('bizzn_pass_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let stripeCustomerId = prevSub?.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    })
    stripeCustomerId = customer.id
  }

  // Redirect-URL aus dem Request ableiten (localhost + Produktion)
  const origin = request.headers.get('origin')
    || request.headers.get('referer')?.replace(/\/[^/]*$/, '')
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'http://localhost:3001'
  const baseUrl = origin.replace(/\/$/, '')

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/mein-konto?tab=abo&success=1`,
    cancel_url: `${baseUrl}/mein-konto?tab=abo`,
    subscription_data: {
      metadata: { userId: user.id },
    },
    metadata: { userId: user.id },
  })

  return NextResponse.json({ url: session.url })
}
