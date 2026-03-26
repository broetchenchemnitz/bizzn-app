import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type OrderRow = Database['public']['Tables']['orders']['Row']

// ---------------------------------------------------------------------------
// Supabase admin client (bypasses RLS — server-to-server only)
// ---------------------------------------------------------------------------
function createAdminSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

// ---------------------------------------------------------------------------
// GET /api/cron/payouts
// Called nightly by Vercel Cron at 23:00 UTC (see vercel.json)
// Secured via Bearer token in Authorization header.
// Idempotency guard: only processes orders with payout_status = 'pending'.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  // 1. Auth — verify the cron secret
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (!authHeader || authHeader !== expectedToken) {
    console.error('Cron /api/cron/payouts: unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()

  // 2. Fetch all projects with Stripe payouts enabled
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, stripe_account_id')
    .eq('stripe_payouts_enabled', true)
    .not('stripe_account_id', 'is', null)

  if (projectsError) {
    console.error('Cron: failed to fetch projects:', projectsError.message)
    return NextResponse.json({ error: projectsError.message }, { status: 500 })
  }

  const eligible = (projects ?? []) as Pick<
    ProjectRow,
    'id' | 'name' | 'stripe_account_id'
  >[]

  console.log(`Cron: processing ${eligible.length} eligible project(s)`)

  let totalTransfers = 0

  for (const project of eligible) {
    const accountId = project.stripe_account_id!

    // 3. Query unpaid completed orders for this project (idempotency guard)
    const { data: unpaidOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount')
      .eq('project_id', project.id)
      .eq('status', 'delivered')
      .eq('payout_status', 'pending')

    if (ordersError) {
      console.error(`Cron: failed to fetch orders for project ${project.id}:`, ordersError.message)
      continue
    }

    const orders = (unpaidOrders ?? []) as Pick<OrderRow, 'id' | 'total_amount'>[]

    if (orders.length === 0) {
      console.log(`Cron: no unpaid orders for project "${project.name}" — skipping`)
      continue
    }

    // 4. Calculate total payout amount in cents
    const totalCents = orders.reduce((sum, o) => sum + o.total_amount, 0)

    console.log(
      `Cron: project "${project.name}" — ${orders.length} order(s), total: ${totalCents} cents → Stripe account ${accountId}`
    )

    // 5. Execute real Stripe transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: totalCents,
        currency: 'eur',
        destination: accountId,
        description: `Bizzn tägliche Auszahlung — ${project.name} (${orders.length} Bestellungen)`,
        metadata: {
          project_id: project.id,
          order_count: String(orders.length),
        },
      })

      console.log(`Cron: Stripe transfer created: ${transfer.id} for ${totalCents} cents`)

      // 6. Mark orders as paid (idempotency — prevents double payout)
      const orderIds = orders.map((o) => o.id)
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payout_status: 'paid' })
        .in('id', orderIds)

      if (updateError) {
        console.error(
          `Cron: CRITICAL — transfer ${transfer.id} succeeded but payout_status update failed:`,
          updateError.message
        )
        // Do NOT fail the request — transfer happened. Log for manual reconciliation.
      } else {
        console.log(`Cron: marked ${orderIds.length} order(s) as payout_status='paid'`)
        totalTransfers++
      }
    } catch (stripeError: unknown) {
      const msg = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
      console.error(`Cron: Stripe transfer failed for project "${project.name}":`, msg)
      // Continue to next project — don't fail the entire cron run
    }
  }

  return NextResponse.json({
    ok: true,
    projects_processed: eligible.length,
    transfers_executed: totalTransfers,
    timestamp: new Date().toISOString(),
  })
}
