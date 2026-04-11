import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Statistiken abrufen (aktive Teilnehmer, ausstehende Gutschriften)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const admin = createAdminClient()

  // Alle Loyalty-Balances für dieses Restaurant
  const { data: balances, error } = await admin
    .from('loyalty_balances')
    .select('balance_cents, last_order_at')
    .eq('project_id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Nur aktive (nicht verfallen, d.h. < 90 Tage)
  const now = Date.now()
  const active = (balances ?? []).filter(b => {
    if (!b.last_order_at) return false
    const daysSince = (now - new Date(b.last_order_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 90
  })

  const total_balance_cents = active.reduce((sum, b) => sum + b.balance_cents, 0)

  return NextResponse.json({
    active_participants: active.length,
    total_balance_cents,
  })
}
