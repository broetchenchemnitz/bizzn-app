import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  // ── Auth: nur Superadmin ────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId, suspend } = await request.json() as { userId: string; suspend: boolean }
  if (!userId) {
    return NextResponse.json({ error: 'userId fehlt' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Alle Projekte des Users sperren/entsperren ──────────────────────────
  const newStatus = suspend ? 'suspended' : 'active'
  const { error: projectError } = await admin
    .from('projects')
    .update({ status: newStatus })
    .eq('user_id', userId)

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 })
  }

  // ── Supabase Auth User sperren/entsperren ───────────────────────────────
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? '876600h' : 'none', // 100 Jahre ≈ permanent
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: newStatus })
}
