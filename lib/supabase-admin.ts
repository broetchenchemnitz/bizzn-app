import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Admin client bypasses RLS — only use server-side in trusted contexts (webhooks, cron jobs)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Strip surrounding quotes that some .env parsers leave in the value
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["']|["']$/g, '')

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
