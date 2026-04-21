import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          set(_n: string, _v: string, _o: CookieOptions) { /* read-only in Route Handler */ },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          remove(_n: string, _o: CookieOptions) { /* read-only in Route Handler */ },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized — session cookie not found. Please log in again.' },
        { status: 401 }
      )
    }

    // Optionaler projectId-Body-Parameter (vom Wizard)
    let projectId: string | null = null
    let customPriceCents: number | null = null
    try {
      const body = await request.json().catch(() => ({}))
      projectId = body.projectId ?? null
    } catch { /* no body = legacy call */ }

    // Custom Preis aus dem Projekt laden (Superadmin-Override)
    if (projectId) {
      const { data: proj } = await supabase
        .from('projects')
        .select('custom_monthly_price_cents')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()
      customPriceCents = proj?.custom_monthly_price_cents ?? null
    }

    const unitAmount = customPriceCents ?? 9900 // Standard: 99 €
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const idempotencyKey = request.headers.get('Idempotency-Key') || crypto.randomUUID()

    const successUrl = projectId
      ? `${origin}/dashboard?wizard_success=true&project=${projectId}`
      : `${origin}/dashboard?success=true`

    const cancelUrl = projectId
      ? `${origin}/onboarding?project=${projectId}&step=9`
      : `${origin}/dashboard?canceled=true`

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Bizzn — Restaurant Live schalten',
              description: 'Einmalig auf bizzn.de veröffentlichen — 0% Provision.',
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_creation: 'always',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        ...(projectId ? { projectId, action: 'go_live' } : {}),
      },
    }, { idempotencyKey })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe returned no checkout URL.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Stripe Checkout Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

