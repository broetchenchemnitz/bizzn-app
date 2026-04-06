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

  const { userId } = await request.json() as { userId: string }
  if (!userId) {
    return NextResponse.json({ error: 'userId fehlt' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Alle Projekte löschen (CASCADE löscht Menu, Orders etc.) ─────────────
  const { error: projectError } = await admin
    .from('projects')
    .delete()
    .eq('user_id', userId)

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 })
  }

  // ── Supabase Auth User löschen ──────────────────────────────────────────
  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
