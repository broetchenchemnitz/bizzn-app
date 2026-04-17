import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/stripe/confirm-paid
 * 
 * Wird aufgerufen nachdem confirmPayment() clientseitig erfolgreich war
 * (redirect: 'if_required' → Zahlung ohne Redirect abgeschlossen).
 * Setzt payment_status auf 'paid', damit der Drive-In Button
 * sofort verfügbar ist — ohne auf den Webhook warten zu müssen.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  const { orderId } = await request.json() as { orderId?: string }

  if (!orderId) {
    return NextResponse.json({ error: 'orderId fehlt.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Sicherstellen, dass die Bestellung dem User gehört
  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, payment_status')
    .eq('id', orderId)
    .single()

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden.' }, { status: 404 })
  }

  // Nur aktualisieren wenn noch pending (idempotent)
  if (order.payment_status !== 'paid') {
    await admin
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId)
  }

  return NextResponse.json({ ok: true })
}
