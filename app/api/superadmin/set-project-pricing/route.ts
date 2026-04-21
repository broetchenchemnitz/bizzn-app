import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/superadmin/set-project-pricing
// Body: { projectId, customPriceCents, trialEndsAt }
// Erfordert: eingeloggter Superadmin (geprüft via SUPERADMIN_EMAIL)

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Superadmin-Auth-Check: Nur SUPERADMIN_EMAIL darf das
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '') ?? request.cookies.get('sb-access-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user } } = await admin.auth.getUser(sessionToken)
    if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden — Superadmin only' }, { status: 403 })
    }

    const body = await request.json()
    const { projectId, customPriceCents, trialEndsAt } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}

    // customPriceCents: null = Standard (99€), 0 = gratis, >0 = custom
    if (customPriceCents !== undefined) {
      updatePayload.custom_monthly_price_cents = customPriceCents === '' ? null : Number(customPriceCents)
    }

    // trialEndsAt: ISO-String oder null
    if (trialEndsAt !== undefined) {
      updatePayload.trial_ends_at = trialEndsAt || null
    }

    const { error } = await admin
      .from('projects')
      .update(updatePayload)
      .eq('id', projectId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
