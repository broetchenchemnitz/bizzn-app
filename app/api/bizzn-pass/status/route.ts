import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/bizzn-pass/status
 *
 * Gibt den aktuellen Bizzn-Pass-Status des eingeloggten Kunden zurück.
 * Wird vom mein-konto Abo-Tab lazy-geladen.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('bizzn_pass_subscriptions')
    .select('status, current_period_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({
      hasPass: false,
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
  }

  const isActive = (data.status === 'active' || data.status === 'trialing') &&
    (!data.current_period_end || new Date(data.current_period_end) > new Date())

  return NextResponse.json({
    hasPass: isActive,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  })
}
