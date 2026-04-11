'use server'

import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Loyalty-Guthaben des Kunden laden (customer_read_own Policy greift)
  const { data: balances, error } = await supabase
    .from('loyalty_balances')
    .select('*')
    .eq('user_id', user.id)
    .order('last_order_at', { ascending: false })

  if (error) {
    console.error('loyalty/balance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Projekt-Infos nachladen (Namen + Slug für Darstellung)
  const projectIds = (balances ?? []).map(b => b.project_id)
  let projects: { id: string; name: string; slug: string; cover_image_url: string | null }[] = []
  if (projectIds.length > 0) {
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, name, slug, cover_image_url')
      .in('id', projectIds)
    projects = projectData ?? []
  }

  const result = (balances ?? []).map(b => {
    const project = projects.find(p => p.id === b.project_id)
    return {
      ...b,
      project_name: project?.name ?? 'Unbekannt',
      project_slug: project?.slug ?? '',
      project_cover: project?.cover_image_url ?? null,
      // 90-Tage-Verfall: berechnen wenn Guthaben läuft ab
      expires_at: b.last_order_at
        ? new Date(new Date(b.last_order_at).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    }
  })

  return NextResponse.json(result)
}
