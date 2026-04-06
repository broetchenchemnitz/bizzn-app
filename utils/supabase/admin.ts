import { createClient } from '@supabase/supabase-js'

/**
 * createAdminClient — Supabase Service-Role Client
 *
 * Uses the SERVICE_ROLE key — bypasses RLS entirely.
 * Only use in server-side API routes that are protected by admin middleware.
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin credentials in environment variables.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
