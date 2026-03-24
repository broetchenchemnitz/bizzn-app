import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    // TODO: Verify Stripe signature here using process.env.STRIPE_WEBHOOK_SECRET once implemented
    console.log('Webhook received, signature:', sig ? 'present' : 'missing')
    console.log('Body length:', body.length)

    return NextResponse.json({ received: true, status: 'success' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
