import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import CheckoutPageClient from '@/components/checkout/CheckoutPageClient'
import type { CartItem } from '@/types/checkout'

export const metadata = {
  title: 'Checkout | Bizzn',
}

/**
 * Checkout page — server component
 * Route: /[domain]/checkout
 *
 * Reads cart from URL query params (passed from MenuBoard).
 * Validates project exists and has Stripe enabled.
 * Renders CheckoutPageClient with hydrated cart.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: { domain: string }
  searchParams: { cart?: string }
}) {
  const supabase = await createClient()

  // Resolve the project from slug/domain
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, slug, stripe_charges_enabled')
    .or(`slug.eq.${params.domain},id.eq.${params.domain}`)
    .single()

  if (error || !project) notFound()

  // Parse cart from query param (JSON-encoded CartItem[])
  let initialCart: CartItem[] = []
  if (searchParams.cart) {
    try {
      initialCart = JSON.parse(decodeURIComponent(searchParams.cart))
    } catch {
      initialCart = []
    }
  }

  // Empty cart → redirect back to storefront
  if (initialCart.length === 0) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="bg-[#242424] rounded-3xl border border-white/5 p-8 text-center max-w-sm">
          <p className="text-white font-semibold text-lg">Dein Warenkorb ist leer.</p>
          <a
            href={`/${params.domain}`}
            className="mt-4 inline-block bg-[#77CC00] text-[#1A1A1A] font-extrabold px-6 py-3 rounded-full text-sm hover:scale-[1.02] transition-transform"
          >
            Zurück zur Speisekarte
          </a>
        </div>
      </div>
    )
  }

  return (
    <CheckoutPageClient
      projectId={project.id}
      projectName={project.name}
      slug={project.slug ?? params.domain}
      initialCart={initialCart}
    />
  )
}
