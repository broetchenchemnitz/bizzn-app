import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * updateSession — Supabase SSR Auth Middleware Utility
 *
 * Called from root middleware.ts to:
 * 1. Refresh the Supabase auth session cookie on every request.
 * 2. Enforce strict route protection for /dashboard (server-side, using getUser()).
 * 3. Prevent authenticated users from accessing auth pages.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser() to securely validate the token on the server
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Kick unauthenticated users out of the dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 2. Prevent authenticated GASTRONOMEN from seeing the restaurant auth pages
  //    Exception: /auth/confirm, /auth/impersonate, and /auth/callback must always be reachable
  //    NOTE: We no longer blindly redirect to /dashboard here, because Kunden
  //    (who share the same Supabase auth) would incorrectly land on the dashboard.
  //    The dashboard layout itself now handles the Gastronom-vs-Kunden distinction.
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPassthroughAuthRoute =
    request.nextUrl.pathname.startsWith('/auth/confirm') ||
    request.nextUrl.pathname.startsWith('/auth/impersonate') ||
    request.nextUrl.pathname.startsWith('/auth/callback')

  if (user && isAuthPage && !isPassthroughAuthRoute) {
    // Nur die Login/Register-Seite redirecten — der User ist schon eingeloggt
    // Redirect zum Dashboard, das Layout dort entscheidet ob Gastronom oder Kunde
    if (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/auth/register') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    // Alle anderen /auth Routen (z.B. /auth/reset-password) durchlassen
  }

  return supabaseResponse
}
