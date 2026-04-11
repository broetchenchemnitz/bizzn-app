import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { projectId, loyalty_enabled } = body

  if (!projectId || typeof loyalty_enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update({ loyalty_enabled })
    .eq('id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
