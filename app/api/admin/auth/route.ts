import { NextResponse, type NextRequest } from 'next/server'
import { validateAdminCredentials, createAdminSession, destroyAdminSession, verifyAdminSession } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'E-Mail und Passwort erforderlich.' }, { status: 400 })
  }

  if (!validateAdminCredentials(email, password)) {
    return NextResponse.json({ error: 'Ungültige Zugangsdaten.' }, { status: 401 })
  }

  await createAdminSession()

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await destroyAdminSession()
  return NextResponse.json({ success: true })
}

// Verify session
export async function GET() {
  const valid = await verifyAdminSession()
  return NextResponse.json({ authenticated: valid })
}
