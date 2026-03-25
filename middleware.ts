import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  // Main domain: standard Supabase Auth guard for /dashboard
  // ------------------------------------------------------------------
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect the /dashboard route
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (request.nextUrl.pathname.startsWith('/auth/login') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}