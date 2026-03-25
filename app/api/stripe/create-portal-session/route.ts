import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    console.log('\n--- [create-portal-session] invoked ---')
    
    // 1. Authenticate user via Supabase SSR
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          set(_n: string, _v: string, _o: CookieOptions) { /* read-only */ },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          remove(_n: string, _o: CookieOptions) { /* read-only */ },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log('[create-portal-session] Authentication failed:', userError?.message || 'No user session')
      return NextResponse.json(
        { error: 'Unauthorized — session cookie not found. Please log in again.' },
        { status: 401 }
      )
    }

    console.log('[create-portal-session] User authenticated:', user.email, 'UID:', user.id)

    // 2. Initialize Stripe
    const stripe = getStripe()
    
    if (!user.email) {
      console.log('[create-portal-session] No email associated with user.')
      return NextResponse.json({ error: 'User email missing' }, { status: 400 })
    }

    // 3. Find the Stripe Customer ID by Email
    console.log(`[create-portal-session] Searching for Stripe Customer by email: ${user.email}`)
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      console.log('[create-portal-session] No Stripe customer found for this email.')
      return NextResponse.json(
        { error: 'Kein aktives Abonnement (Customer) für diese E-Mail-Adresse gefunden.' },
        { status: 404 }
      )
    }

    const stripeCustomerId = customers.data[0].id
    console.log('[create-portal-session] Found Stripe Customer ID:', stripeCustomerId)

    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bizzn.de'
    const returnUrl = `${origin}/dashboard`

    console.log('[create-portal-session] Creating billing portal session with return URL:', returnUrl)

    // 4. Create standard billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    })

    console.log('[create-portal-session] Success! Portal session created:', portalSession.url)

    // 5. Return JSON implicitly
    return NextResponse.json({ url: portalSession.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('[create-portal-session] Stripe Portal Error in catch block:', message)
    
    // IMPORTANT: Always return JSON in catch block to prevent frontend crash
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
