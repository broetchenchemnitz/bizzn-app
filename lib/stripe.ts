import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is missing. Please set it in your .env.local file.')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
      appInfo: {
        name: 'Bizzn App',
        version: '0.1.0',
      },
    })
  }
  return _stripe
}

// Convenience proxy for use in route handlers
export const stripe: Pick<Stripe, 'checkout'> = {
  get checkout() { return getStripe().checkout },
}

