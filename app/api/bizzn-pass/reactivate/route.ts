import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

/**
 * POST /api/bizzn-pass/reactivate
 *
 * Reaktiviert einen gekündigten Bizzn-Pass (setzt cancel_at zurück).
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('bizzn_pass_subscriptions')
    .select('id, stripe_subscription_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) {
    return NextResponse.json({ error: 'Kein Abo gefunden.' }, { status: 404 })
  }

  try {
    const stripe = getStripe()

    // Kündigung rückgängig machen: cancel_at zurücksetzen
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at: '' as any,
    })

    // DB aktualisieren
    await admin
      .from('bizzn_pass_subscriptions')
      .update({
        cancel_at_period_end: false,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id)

    console.log('Bizzn-Pass reactivated for user:', user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Bizzn-Pass reactivation failed:', err)
    return NextResponse.json(
      { error: err.message || 'Reaktivierung fehlgeschlagen.' },
      { status: 500 }
    )
  }
}
