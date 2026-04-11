import { notFound } from 'next/navigation'
import type { Database } from '@/types/supabase'
import type { Metadata } from 'next'
import OrderTracker from '@/components/storefront/OrderTracker'
import { createCustomerSupabase } from '@/app/actions/customer'

export const dynamic = 'force-dynamic'

type OrderRow = Database['public']['Tables']['orders']['Row']

export async function generateMetadata({
  params,
}: {
  params: { domain: string; orderId: string }
}): Promise<Metadata> {
  return {
    title: `Bestellung #${params.orderId.slice(0, 8).toUpperCase()} | bizzn`,
  }
}

export default async function OrderTrackingPage({
  params,
}: {
  params: { domain: string; orderId: string }
}) {
  const { domain, orderId } = params
  const supabase = await createCustomerSupabase()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single<OrderRow>()

  if (!order) {
    notFound()
  }

  return (
    <OrderTracker
      orderId={orderId}
      domain={domain}
      initialOrder={order}
    />
  )
}
