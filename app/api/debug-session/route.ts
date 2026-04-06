import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only */ },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  return NextResponse.json({
    loggedIn: !!user,
    email: user?.email ?? null,
    superadminEmail: process.env.SUPERADMIN_EMAIL,
    isSuperadmin: user?.email === process.env.SUPERADMIN_EMAIL,
    error: error?.message ?? null,
    cookieNames: cookieStore.getAll().map(c => c.name),
  })
}
