import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion })

export async function POST(req: NextRequest) {
  try {
    const { orderId, amount, projectId } = await req.json()

    if (!orderId || !amount || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate amount (minimum 50 cents)
    if (typeof amount !== 'number' || amount < 50) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch project to get connected Stripe account
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, stripe_account_id, stripe_charges_enabled')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.stripe_charges_enabled || !project.stripe_account_id) {
      return NextResponse.json({ error: 'Payments not activated for this restaurant' }, { status: 403 })
    }

    // Create PaymentIntent on the connected account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,                    // in cents
        currency: 'eur',
        metadata: {
          orderId,
          projectId,
          projectName: project.name,
        },
        automatic_payment_methods: { enabled: true },
      },
      {
        stripeAccount: project.stripe_account_id,
      }
    )

    // NOTE: payment_intent_id column pending migration — tracked via metadata.orderId
    // await supabase.from('orders').update({ payment_intent_id: paymentIntent.id }).eq('id', orderId)

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[checkout/payment-intent]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
