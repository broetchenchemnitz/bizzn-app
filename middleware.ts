import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const MAIN_DOMAINS = new Set([
  'localhost:3000',
  'bizzn.de',
  'www.bizzn.de',
  'bizzn-chemnitz.vercel.app',
])

export async function middleware(request: NextRequest) {
  // 1. Session Update & Edge Auth Guards MÜSSEN zuerst laufen!
  const response = await updateSession(request)

  // 2. Wenn updateSession ein Redirect auslöst (z.B. Login Kick), sofort ausführen!
  if (response.status >= 300 && response.status < 400) {
    return response
  }

  // 3. Subdomain-Routing anwenden
  const hostname = request.headers.get('host') ?? ''
  if (!MAIN_DOMAINS.has(hostname)) {
    const subdomain = hostname.split('.')[0]
    if (subdomain) {
      const url = request.nextUrl.clone()
      url.pathname = `/${subdomain}${request.nextUrl.pathname}`

      // WICHTIG: Headers (inkl. Supabase Set-Cookie) vom response übernehmen!
      return NextResponse.rewrite(url, { headers: response.headers })
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}