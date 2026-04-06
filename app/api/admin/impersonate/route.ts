import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  // ── Auth: nur Superadmin darf impersonieren ─────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId } = await request.json() as { userId: string }
  if (!userId) {
    return NextResponse.json({ error: 'userId fehlt' }, { status: 400 })
  }

  // ── Basis-URL: localhost in Dev, bizzn.de in Production ────────────────
  const origin = request.headers.get('origin') ?? 'http://localhost:3000'
  const baseUrl = origin.startsWith('http://localhost')
    ? 'http://localhost:3000'
    : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bizzn.de')

  // ── User-E-Mail laden ───────────────────────────────────────────────────
  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId)
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })
  }

  // ── Magic Link generieren (hashed_token Ansatz) ─────────────────────────
  // Wir nutzen den hashed_token, NICHT den action_link.
  // So umgehen wir Supabase's eigene Redirect-Logik vollständig.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
    options: { redirectTo: `${baseUrl}/dashboard` },
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message ?? 'Token-Generierung fehlgeschlagen' },
      { status: 500 }
    )
  }

  // ── Eigene Confirm-URL bauen ────────────────────────────────────────────
  // Wir leiten den Admin zu /auth/confirm, das den Token serverseitig einlöst.
  const confirmUrl = `${baseUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=/dashboard`

  return NextResponse.json({ link: confirmUrl })
}
