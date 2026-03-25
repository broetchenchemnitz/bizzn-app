import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Fetch project and verify ownership
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) {
    return NextResponse.json({ error: 'Project not found or access denied.' }, { status: 403 })
  }

  let stripeAccountId = project.stripe_account_id

  // Create a new Stripe Connect account if one doesn't exist yet
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      email: user.email,
      metadata: {
        bizzn_project_id: projectId,
        bizzn_user_id: user.id,
      },
    })

    stripeAccountId = account.id

    const { error: updateError } = await supabase
      .from('projects')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError)
      return NextResponse.json({ error: 'Failed to save Stripe account.' }, { status: 500 })
    }
  }

  // Create the Stripe onboarding account link
  const baseUrl = request.nextUrl.origin
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: 'account_onboarding',
    refresh_url: `${baseUrl}/api/stripe/connect?projectId=${projectId}`,
    return_url: `${baseUrl}/dashboard/project/${projectId}`,
  })

  return NextResponse.redirect(accountLink.url)
}
