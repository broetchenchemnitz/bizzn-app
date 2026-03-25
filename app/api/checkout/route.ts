import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // Read cookies directly from the request object — more reliable in Route Handlers
    // than cookies() from next/headers when called from a client-side fetch()
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

    // Derive absolute base URL from the request itself — avoids NEXT_PUBLIC_SITE_URL misconfiguration
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Bizzn Premium Build',
              description: 'AI-assisted enterprise development service.',
            },
            unit_amount: 9900, // 99.00 EUR
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_creation: 'always',
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/dashboard?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
      },
    })

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
