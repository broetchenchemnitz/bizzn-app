import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const MAIN_DOMAINS = new Set([
  'localhost:3000',
  'bizzn.de',
  'www.bizzn.de',
])

export async function middleware(request: NextRequest) {
  // 1. Session & Cookies von Supabase validieren (MUSS zuerst laufen)
  const response = await updateSession(request)

  // 2. Auth-Redirects sofort passieren lassen
  if (response.status >= 300 && response.status < 400) {
    return response
  }

  const hostname = request.headers.get('host') ?? ''

  // 3. Snippet 1: Robust Host Validation (IPv6/Localhost/Vercel)
  const isVercelPreview = hostname?.endsWith('.vercel.app') || false
  const isLocalhost = hostname === 'localhost' || hostname?.startsWith('localhost:')
  // Deckt IPv4 und rudimentär IPv6 (via Brackets) ab
  const isIPAddress = hostname
    ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]+)?$/.test(hostname) || hostname.includes('[')
    : false

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

  // 1. Strikte Validierung der Subdomain (nur Alphanumerisch + Bindestrich)
  const subdomainRegex = /^[a-zA-Z0-9-]+$/
  if (!extractedSubdomain || !subdomainRegex.test(extractedSubdomain)) {
    // Sicherheits-Fallback: Reguläres Routing ohne Rewrite, wenn ungültig
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  const requestHeaders = new Headers(request.headers)
  // Header-Injection ist durch die Regex-Validierung nun ausgeschlossen
  requestHeaders.set('x-subdomain', extractedSubdomain)

  // 2. Rewrite-Logik (Query-Parameter werden nicht gedropt)
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