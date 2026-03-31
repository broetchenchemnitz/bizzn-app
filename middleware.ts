import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const MAIN_DOMAINS = new Set([
  'localhost:3000',
  'bizzn.de',
  'www.bizzn.de',
])

export async function middleware(request: NextRequest) {
  // 1. Session & Cookies von Supabase validieren
  const response = await updateSession(request)

  // 2. Auth-Redirects sofort passieren lassen
  if (response.status >= 300 && response.status < 400) {
    return response
  }

  const hostname = request.headers.get('host') ?? ''

  // 3. Sicherheits-Checks für Preview-Environments und direkte IP-Aufrufe
  const isVercelPreview = hostname.endsWith('.vercel.app')
  const isIPAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]+)?$/.test(hostname)

  if (!MAIN_DOMAINS.has(hostname) && !isVercelPreview && !isIPAddress) {
    const subdomain = hostname.split('.')[0]

    if (subdomain && subdomain !== 'www') {
      const url = request.nextUrl.clone()
      url.pathname = `/${subdomain}${request.nextUrl.pathname}`

      // 4. Rewrite Response erstellen und REQUEST-Header erhalten
      const rewriteResponse = NextResponse.rewrite(url, {
        request: {
          headers: request.headers,
        },
      })

      // 5. RESPONSE-Header (Cookies von Supabase) sauber mergen
      response.headers.forEach((value, key) => {
        rewriteResponse.headers.append(key, value)
      })

      return rewriteResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}