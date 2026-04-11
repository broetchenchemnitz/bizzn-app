import { NextResponse } from 'next/server'
import { getDriveInStatus } from '@/app/actions/drive-in'

/**
 * GET /api/drive-in/status?orderId=...
 *
 * Gibt Drive-In Eligibility + Arrived-Status zurück.
 * Wird vom OrderTracker und mein-konto/Bestellungen lazy geladen.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json(null, { status: 400 })

  const status = await getDriveInStatus(orderId)
  if (!status) return NextResponse.json(null, { status: 200 })

  return NextResponse.json(status)
}
