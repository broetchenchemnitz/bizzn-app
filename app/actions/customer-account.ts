'use server'

import { createCustomerSupabase } from '@/app/actions/customer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderHistoryItem {
  id: string
  created_at: string
  status: string
  order_type: string
  total_amount: number
  restaurant_name: string
  restaurant_slug: string | null
  items: { name: string; quantity: number; price: number }[]
}

export interface CustomerProfile {
  name: string
  email: string | null
  phone: string | null
}

// ─── Profil laden ──────────────────────────────────────────────────────────────

export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  const supabase = await createCustomerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('name, phone')
    .eq('id', user.id)
    .single()

  return {
    name: profile?.name ?? (user.user_metadata?.name as string) ?? '',
    email: user.email ?? null,
    phone: profile?.phone ?? null,
  }
}

// ─── Profil aktualisieren ─────────────────────────────────────────────────────

export async function updateCustomerProfile(input: {
  name: string
  phone: string
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createCustomerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt.' }

  const name = input.name.trim()
  const phone = input.phone.trim() || null

  if (!name) return { error: 'Name darf nicht leer sein.' }

  // 1. customer_profiles updaten (upsert, falls noch nicht vorhanden)
  const { error: profileError } = await supabase
    .from('customer_profiles')
    .upsert({ id: user.id, name, phone }, { onConflict: 'id' })

  if (profileError) {
    console.error('updateCustomerProfile error:', profileError)
    return { error: 'Profil konnte nicht gespeichert werden.' }
  }

  // 2. Auth-Metadata synchron halten (für getCustomerSession)
  await supabase.auth.updateUser({ data: { name } })

  return { success: true }
}

// ─── Bestellhistorie laden ────────────────────────────────────────────────────

export async function getMyOrders(): Promise<OrderHistoryItem[]> {
  const supabase = await createCustomerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Orders des Kunden + Projekt-Name + Items
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      status,
      order_type,
      total_amount,
      projects ( name, slug ),
      order_items ( item_name, quantity, price_at_time )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('getMyOrders error:', error)
    return []
  }

  return (orders ?? []).map((o) => {
    // projects is a single object (FK relation), not an array
    const project = Array.isArray(o.projects) ? o.projects[0] : o.projects
    return {
      id: o.id,
      created_at: o.created_at,
      status: o.status ?? 'pending',
      order_type: o.order_type ?? 'takeaway',
      total_amount: o.total_amount ?? 0,
      restaurant_name: project?.name ?? 'Restaurant',
      restaurant_slug: project?.slug ?? null,
      items: (o.order_items ?? []).map((i) => ({
        name: i.item_name ?? '–',
        quantity: i.quantity ?? 1,
        price: i.price_at_time ?? 0,
      })),
    }
  })
}
