import { NextResponse, type NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/stripe/bizzn-pass/portal
 *
 * Erstellt eine Stripe Customer Portal Session URL.
 * Kunden können dort ihr Abo kündigen, Zahlungsmethode ändern etc.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  const body = await request.json() as { returnUrl?: string }
  const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/mein-konto`

  const admin = createAdminClient()
  const stripe = getStripe()

  // Stripe Customer ID lesen
  const { data: sub } = await admin
    .from('bizzn_pass_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'Kein Stripe-Konto gefunden.' }, { status: 404 })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe-Fehler'
    console.error('[bizzn-pass/portal] failed:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
