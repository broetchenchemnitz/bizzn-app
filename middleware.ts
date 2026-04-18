import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const MAIN_DOMAINS = new Set([
  'localhost:3000',
  'bizzn.de',
  'www.bizzn.de',
])

// M13: Reservierte Subdomains, die zum Dashboard routen
const APP_SUBDOMAINS = new Set(['app'])

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // ── Superadmin: Kein spezieller Middleware-Guard nötig.
  //    Auth-Schutz erfolgt über das Layout (app/superadmin/layout.tsx).
  //    Middleware leitet nur die Session-Refresh durch updateSession() weiter.

  // 0. Subdomain-Localhost-Check FIRST (before auth): sushitaxi.localhost:3000
  const localhostSubdomainMatch = hostname?.match(/^([a-zA-Z0-9-]+)\.localhost(:[0-9]+)?$/)
  if (localhostSubdomainMatch) {
    const subdomain = localhostSubdomainMatch[1]

    // M13: app.localhost:3000 → Dashboard (mit Session-Validierung)
    if (APP_SUBDOMAINS.has(subdomain)) {
      const response = await updateSession(request)
      // Wenn Pfad root ist, zu /dashboard redirecten für saubere UX
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return response
    }

    // API routes: do NOT rewrite — they live under /api/* directly
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
      return NextResponse.next()
    }

    // Alle anderen Subdomains → Storefront-Rewrite
    const url = request.nextUrl.clone()
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-subdomain', subdomain)
    const rewritePath = `/${subdomain}${url.pathname}${url.search}`
    return NextResponse.rewrite(new URL(rewritePath, request.url), {
      request: { headers: requestHeaders },
    })
  }

  // 1. Session & Cookies von Supabase validieren (nur für Haupt-Domain)
  const response = await updateSession(request)

  // 2. Auth-Redirects sofort passieren lassen
  if (response.status >= 300 && response.status < 400) {
    return response
  }

  // 3. Snippet 1: Robust Host Validation (IPv6/Localhost/Vercel)
  const isVercelPreview = hostname?.endsWith('.vercel.app') || false
  // Deckt IPv4 und rudimentär IPv6 (via Brackets) ab
  const isIPAddress = hostname
    ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]+)?$/.test(hostname) || hostname.includes('[')
    : false

  const isLocalhost = hostname === 'localhost' || hostname?.startsWith('localhost:')

  if (isVercelPreview || isLocalhost || isIPAddress) {
    // Return early — treat as root domain, session already validated
    return response
  }

  // 4. Main domain: direkt weiterleiten
  if (MAIN_DOMAINS.has(hostname)) {
    return response
  }

  // 5. Subdomain-Routing
  const extractedSubdomain = hostname.split('.')[0]

  // Strikte Validierung der Subdomain (nur Alphanumerisch + Bindestrich)
  const subdomainRegex = /^[a-zA-Z0-9-]+$/
  if (!extractedSubdomain || !subdomainRegex.test(extractedSubdomain)) {
    // Sicherheits-Fallback: Reguläres Routing ohne Rewrite, wenn ungültig
    return NextResponse.next()
  }

  // M13: app.bizzn.de → Dashboard (kein Storefront-Rewrite)
  if (APP_SUBDOMAINS.has(extractedSubdomain)) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Session bereits validiert (updateSession() oben), einfach durchlassen
    return response
  }

  // API routes: do NOT rewrite — they live under /api/* directly
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return response
  }

  const url = request.nextUrl.clone()
  const requestHeaders = new Headers(request.headers)
  // Header-Injection ist durch die Regex-Validierung nun ausgeschlossen
  requestHeaders.set('x-subdomain', extractedSubdomain)

  // Rewrite-Logik (Query-Parameter werden nicht gedropt)
  const rewritePath = `/${extractedSubdomain}${url.pathname}${url.search}`
  return NextResponse.rewrite(new URL(rewritePath, request.url), {
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}