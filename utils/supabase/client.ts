import { createBrowserClient } from '@supabase/ssr'

/**
 * createClient — Supabase Browser Utility
 *
 * Use in Client Components ('use client') only.
 * Companion to utils/supabase/server.ts for the SSR pattern.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
