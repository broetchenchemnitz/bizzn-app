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

  // Gastronomen-Abo: status changes & cancellations (projects table)
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const supabase = createAdminClient()

    // Nur für Gastronomen-Abos (project-bezogene subscriptions)
    const { data: projectExists } = await supabase
      .from('projects')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()

    if (projectExists) {
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
        console.error('Webhook: failed to sync project subscription status:', error.message)
        return NextResponse.json({ received: true, warning: error.message })
      }

      console.log(`Webhook: project subscription ${event.type} synced for:`, subscription.id)
    }
  }

  // ── M27: Bizzn-Pass Subscription Lifecycle ──────────────────────────────────

  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.userId

    console.log('Webhook: bizzn-pass subscription.created', subscription.id, 'userId:', userId)

    if (userId) {
      const supabase = createAdminClient()
      // Upsert: verhindert Duplikate falls subscribe-Route bereits einen DB-Eintrag angelegt hat
      await supabase
        .from('bizzn_pass_subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_subscription_id' }
        )
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const supabase = createAdminClient()

    // Bizzn-Pass-Sub aktualisieren
    const { data: passRow } = await supabase
      .from('bizzn_pass_subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()

    if (passRow) {
      await supabase
        .from('bizzn_pass_subscriptions')
        .update({
          status: subscription.status,
          current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      console.log(`Webhook: bizzn-pass ${event.type} synced for:`, subscription.id)
    }
  }

  // M25: Online-Zahlung — Payment Intent Status-Sync
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const orderId = paymentIntent.metadata?.orderId

    console.log('Webhook: payment_intent.succeeded', paymentIntent.id, 'orderId:', orderId)

    if (orderId) {
      const supabase = createAdminClient()
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId)

      if (error) {
        console.error('Webhook: failed to mark order as paid:', error.message)
        return NextResponse.json({ received: true, warning: error.message })
      }
      console.log('Webhook: order marked as paid:', orderId)
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const orderId = paymentIntent.metadata?.orderId

    console.log('Webhook: payment_intent.payment_failed', paymentIntent.id, 'orderId:', orderId)

    if (orderId) {
      const supabase = createAdminClient()
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId)
    }
  }

  return NextResponse.json({ received: true })
}
