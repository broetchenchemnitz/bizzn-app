import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// ---------------------------------------------------------------------------
// Main domain list — requests from these hosts are treated as the Bizzn admin
// app and get normal auth-guard behaviour.
// ---------------------------------------------------------------------------
const MAIN_DOMAINS = new Set([
  'localhost:3000',
  'bizzn.de',
  'www.bizzn.de',
  'bizzn-chemnitz.vercel.app', // <-- Hier ist das VIP-Ticket für Vercel!
])

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''

  // ------------------------------------------------------------------
  // Multi-tenant subdomain routing
  // If the request comes from a subdomain (e.g. marios.localhost:3000),
  // rewrite it transparently to /[domain]/... so Next.js serves
  // app/[domain]/page.tsx without changing the visible URL.
  // ------------------------------------------------------------------
  if (!MAIN_DOMAINS.has(hostname)) {
    // Extract subdomain: "marios.localhost:3000" → "marios"
    // "marios.bizzn.de"         → "marios"
    const subdomain = hostname.split('.')[0]

    if (subdomain) {
      const url = request.nextUrl.clone()
      // Rewrite /some/path → /marios/some/path
      url.pathname = `/${subdomain}${request.nextUrl.pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // ------------------------------------------------------------------
  // Main domain: delegate to updateSession utility for strict auth guard
  // (getUser() server-side validation, /dashboard protection, /auth redirect)
  // ------------------------------------------------------------------
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}