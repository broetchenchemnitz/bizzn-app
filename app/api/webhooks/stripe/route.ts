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

    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert(insertData)
      .select('id')
      .single()

    if (projectError) {
      console.error('Webhook DB insert failed:', projectError.message, projectError)
      return NextResponse.json({ error: projectError.message }, { status: 500 })
    }

    // M3: Auto-assign owner role for the project creator
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: newProject.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberError) {
      console.error('Webhook: failed to assign owner role:', memberError.message)
      // Non-fatal — project exists, role can be repaired; return 200 to avoid Stripe retry
      return NextResponse.json({ received: true, warning: 'Owner role assignment failed' })
    }

    console.log('Webhook: project inserted + owner assigned for userId:', userId)
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account

    console.log('Webhook: account.updated for Stripe account:', account.id)

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('projects')
      .update({
        stripe_charges_enabled: account.charges_enabled ?? false,
        stripe_payouts_enabled: account.payouts_enabled ?? false,
      })
      .eq('stripe_account_id', account.id)

    if (error) {
      console.error('Webhook: failed to update Stripe account status:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Webhook: stripe account status synced for:', account.id)
  }

  // Subscription lifecycle — status changes & cancellations
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const supabase = createAdminClient()

    const updatePayload: Record<string, unknown> = {
      subscription_status: subscription.status,
    }
    if (event.type === 'customer.subscription.deleted') {
      updatePayload.plan_type = 'free'
    }

    const { error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Webhook: failed to sync subscription status:', error.message)
      // Return 200 to prevent Stripe retry loops on data errors
      return NextResponse.json({ received: true, warning: error.message })
    }

    console.log(`Webhook: subscription ${event.type} synced for:`, subscription.id)
  }

  return NextResponse.json({ received: true })
}
