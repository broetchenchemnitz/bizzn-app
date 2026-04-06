'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

/**
 * /auth/impersonate
 *
 * Landing page for the superadmin "Einloggen als Gastronom" magic link.
 * The magic link redirects here with #access_token=...&refresh_token=...
 * in the URL hash. This client component reads the tokens, sets the session
 * via the browser Supabase client (which writes the auth cookies), then
 * redirects to /dashboard.
 */
export default function ImpersonatePage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      router.replace('/auth/login?error=invalid_impersonate_link')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        router.replace('/auth/login?error=' + encodeURIComponent(error.message))
      } else {
        router.replace('/dashboard')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Sitzung wird übernommen…</p>
      </div>
    </div>
  )
}
