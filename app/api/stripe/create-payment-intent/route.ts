import { NextResponse, type NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json() as {
    projectId: string
    amountCents: number
    orderId?: string
  }

  const { projectId, amountCents, orderId } = body

  if (!projectId || !amountCents || amountCents < 50) {
    return NextResponse.json({ error: 'Ungültige Parameter.' }, { status: 400 })
  }

  // Load project to get Stripe Connect account
  const adminSupabase = createAdminClient()
  const { data: project } = await adminSupabase
    .from('projects')
    .select('stripe_account_id, stripe_charges_enabled, online_payment_enabled')
    .eq('id', projectId)
    .single<Pick<ProjectRow, 'stripe_account_id' | 'stripe_charges_enabled' | 'online_payment_enabled'>>()

  if (!project?.stripe_account_id) {
    return NextResponse.json({ error: 'Kein Stripe-Konto für diesen Betrieb hinterlegt.' }, { status: 400 })
  }

  if (!project.stripe_charges_enabled) {
    return NextResponse.json({ error: 'Stripe-Konto noch nicht vollständig verifiziert.' }, { status: 400 })
  }

  if (!project.online_payment_enabled) {
    return NextResponse.json({ error: 'Online-Zahlung ist für diesen Betrieb nicht aktiviert.' }, { status: 400 })
  }

  const stripe = getStripe()

  // Create Payment Intent
  // In live mode: route funds to the restaurant's connected Stripe account via transfer_data.
  // In test mode: charge the platform account directly (connected accounts require full
  // Express/Standard onboarding via account links, which is part of the restaurant onboarding flow).
  const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
  let paymentIntent: import('stripe').default.PaymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      ...(isLiveMode && project.stripe_account_id ? {
        transfer_data: { destination: project.stripe_account_id },
      } : {}),
      metadata: {
        projectId,
        ...(orderId ? { orderId } : {}),
        ...(user?.id ? { userId: user.id } : {}),
        ...(project.stripe_account_id ? { connectedAccountId: project.stripe_account_id } : {}),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe-Fehler beim Erstellen der Zahlung.'
    console.error('[stripe] paymentIntents.create failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // If orderId provided, store the payment intent reference and mark as pending
  if (orderId) {
    await adminSupabase
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', orderId)
  }

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
