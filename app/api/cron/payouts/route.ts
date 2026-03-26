import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

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
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  // 1. Auth — verify the cron secret
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (!authHeader || authHeader !== expectedToken) {
    console.error('Cron /api/cron/payouts: unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch all projects with Stripe payouts enabled
  const supabase = createAdminSupabase()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, stripe_account_id')
    .eq('stripe_payouts_enabled', true)
    .not('stripe_account_id', 'is', null)

  if (error) {
    console.error('Cron: failed to fetch projects:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const eligible = (projects ?? []) as Pick<
    ProjectRow,
    'id' | 'name' | 'stripe_account_id'
  >[]

  console.log(`Cron: processing ${eligible.length} eligible project(s)`)

  for (const project of eligible) {
    const accountId = project.stripe_account_id!

    console.log(`Cron: processing project "${project.name}" (${project.id}) — Stripe account: ${accountId}`)

    // 3. Payout placeholder — real transfer logic goes here
    // Uncomment and fill in `amount` and `currency` when business logic is ready:
    //
    // await stripe.transfers.create({
    //   amount: <amount_in_cents>,
    //   currency: 'eur',
    //   destination: accountId,
    //   description: `Bizzn tägliche Auszahlung — ${project.name}`,
    // })
    //
    // For now, validate the account is reachable:
    const account = await stripe.accounts.retrieve(accountId)
    console.log(`Cron: account "${accountId}" status — charges: ${account.charges_enabled}, payouts: ${account.payouts_enabled}`)
  }

  return NextResponse.json({
    ok: true,
    processed: eligible.length,
    timestamp: new Date().toISOString(),
  })
}
