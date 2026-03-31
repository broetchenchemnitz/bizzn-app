import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client — singleton, safe to call multiple times.
 * Uses createBrowserClient from @supabase/ssr so session cookies are
 * kept in sync with the server-side middleware (utils/supabase/middleware.ts).
 */
let _client: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

// Convenience proxy for client components — drop-in replacement for old supabase export
export const supabase = {
  get auth() { return getBrowserClient().auth },
}
