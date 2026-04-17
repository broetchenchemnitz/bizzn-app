import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/utils/supabase/server'
import type { Database } from '@/types/supabase'

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: NextRequest) {
  // ── Auth Guard: Session + Ownership ─────────────────────────────────────────
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  }

  const body = await req.json()
  const { projectId, loyalty_enabled } = body

  if (!projectId || typeof loyalty_enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Ownership-Check: Nur der Projekt-Owner darf die Einstellung ändern
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!project) {
    return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 })
  }

  // Admin-Client nur für DB-Update (RLS bypass nach verifizierter Ownership)
  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update({ loyalty_enabled })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
