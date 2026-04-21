import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

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

  // 0. Subdomain-Localhost-Check FIRST (before auth): sushitaxi.localhost:3000
  const localhostSubdomainMatch = hostname?.match(/^([a-zA-Z0-9-]+)\.localhost(:[0-9]+)?$/)
  if (localhostSubdomainMatch) {
    const subdomain = localhostSubdomainMatch[1]

    // M13: app.localhost:3000 → Dashboard (mit Session-Validierung)
    if (APP_SUBDOMAINS.has(subdomain)) {
      const response = await updateSession(request)
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      // M31: Neuer User ohne Projekt → Wizard
      if (pathname === '/dashboard') {
        const wizardRedirect = await checkNewUserWizardRedirect(request)
        if (wizardRedirect) return wizardRedirect
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
    // M31: Neuer User ohne Projekt → Wizard
    if (pathname === '/dashboard') {
      const wizardRedirect = await checkNewUserWizardRedirect(request)
      if (wizardRedirect) return wizardRedirect
    }
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

// ─── M31: Neuer User ohne Projekt → Wizard ───────────────────────────────────
// Nur wenn der User genau /dashboard besucht und noch kein Projekt hat.
// Bestehende Gastronomen bleiben unberührt.
async function checkNewUserWizardRedirect(request: NextRequest): Promise<NextResponse | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          set() {},
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          remove() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null // Unauthenticated → dashboard layout handles login redirect

    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Kein Projekt → Wizard starten
    if ((count ?? 0) === 0) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    return null // Hat Projekte → normales Dashboard
  } catch {
    return null // Fehler → normal weitermachen
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}