import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import type { Database } from '@/types/supabase'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    console.error('Webhook: missing stripe-signature or STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('Webhook signature error:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  console.log('Webhook event received:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.userId ?? session.client_reference_id
    const customerEmail = session.customer_details?.email ?? session.customer_email

    if (!userId) {
      console.error('Webhook: no userId in session metadata or client_reference_id', {
        sessionId: session.id,
        metadata: session.metadata,
      })
      // Return 200 so Stripe doesn't retry — this is a data problem, not a transport problem
      return NextResponse.json({ received: true, warning: 'No userId found' })
    }

    console.log('Webhook: inserting project for userId:', userId)

    const supabase = createAdminClient()

    type ProjectInsert = Database['public']['Tables']['projects']['Insert']
    const insertData: ProjectInsert = {
      user_id: userId,
      name: `Project — ${customerEmail ?? userId}`,
      status: 'active',
    }

    const { error } = await supabase.from('projects').insert(insertData)

    if (error) {
      console.error('Webhook DB insert failed:', error.message, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Webhook: project inserted successfully for userId:', userId)
  }

  return NextResponse.json({ received: true })
}
