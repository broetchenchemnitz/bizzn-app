'use server'

import { createAdminClient } from '@/lib/supabase-admin'

// ── Types ────────────────────────────────────────────────────────────────────

export type AdminStats = {
  totalRevenue: number
  totalOrders: number
  ordersToday: number
  ordersThisWeek: number
  totalCustomers: number
  passHolders: number
  passCancelled: number
  passRevenue: number
  totalRestaurants: number
  activeRestaurants: number
  suspendedRestaurants: number
}

export type AdminCustomer = {
  userId: string
  name: string
  email: string | null
  phone: string | null
  hasPass: boolean
  passStatus: string | null
  passEnd: string | null
  totalOrders: number
  totalRevenue: number
  bans: { projectId: string; restaurantName: string; reason: string | null }[]
  createdAt: string | null
}

export type AdminRestaurant = {
  id: string
  name: string
  slug: string | null
  ownerEmail: string | null
  planType: string | null
  subscriptionStatus: string | null
  subscriptionPaidUntil: string | null
  isSuspended: boolean
  suspensionReason: string | null
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  createdAt: string
}

export type AdminPassHolder = {
  userId: string
  name: string
  email: string | null
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  createdAt: string
  stripeSubscriptionId: string
}

// ── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getAdminDashboardStats(): Promise<AdminStats> {
  const admin = createAdminClient()

  // Parallel laden
  const [
    ordersResult,
    customersResult,
    passResult,
    projectsResult,
  ] = await Promise.all([
    admin.from('orders').select('total_amount, created_at'),
    admin.from('customer_profiles').select('id', { count: 'exact', head: true }),
    admin.from('bizzn_pass_subscriptions').select('status, cancel_at_period_end'),
    admin.from('projects').select('id, is_suspended, status'),
  ])

  const orders = ordersResult.data ?? []
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const ordersToday = orders.filter(o => o.created_at >= todayStart).length
  const ordersThisWeek = orders.filter(o => o.created_at >= weekStart).length

  const passes = passResult.data ?? []
  const activeP = passes.filter(p => p.status === 'active' || p.status === 'trialing')
  const cancelledP = activeP.filter(p => p.cancel_at_period_end)

  const projects = projectsResult.data ?? []

  return {
    totalRevenue,
    totalOrders: orders.length,
    ordersToday,
    ordersThisWeek,
    totalCustomers: customersResult.count ?? 0,
    passHolders: activeP.length,
    passCancelled: cancelledP.length,
    passRevenue: activeP.length * 499, // 4,99 € in Cent
    totalRestaurants: projects.length,
    activeRestaurants: projects.filter(p => !p.is_suspended).length,
    suspendedRestaurants: projects.filter(p => p.is_suspended).length,
  }
}

// ── Kunden ────────────────────────────────────────────────────────────────────

export async function getAdminCustomers(
  filter: 'all' | 'pass' | 'banned' = 'all',
  search = ''
): Promise<AdminCustomer[]> {
  const admin = createAdminClient()

  // Alle Kunden-Profile laden
  const { data: profiles } = await admin.from('customer_profiles').select('id, name, phone, created_at')
  if (!profiles) return []

  // E-Mails aus auth.users
  const { data: { users } } = await admin.auth.admin.listUsers()
  const emailMap = new Map(users.map(u => [u.id, u.email ?? null]))

  // Pass-Daten
  const { data: passes } = await admin.from('bizzn_pass_subscriptions').select('user_id, status, cancel_at_period_end, current_period_end')

  // Sperren
  const { data: bans } = await admin
    .from('restaurant_customers')
    .select('user_id, project_id, is_banned, ban_reason')
    .eq('is_banned', true)

  // Bestellungen aggregieren
  const { data: orders } = await admin.from('orders').select('user_id, total_amount')

  // Restaurant-Namen für Sperren
  const bannedProjectIds = [...new Set((bans ?? []).map(b => b.project_id))]
  const { data: restaurants } = bannedProjectIds.length
    ? await admin.from('projects').select('id, name').in('id', bannedProjectIds)
    : { data: [] }
  const restaurantMap = new Map((restaurants ?? []).map(r => [r.id, r.name]))

  // Aggregieren
  const customers: AdminCustomer[] = profiles.map(p => {
    const pass = (passes ?? []).find(ps => ps.user_id === p.id)
    const userOrders = (orders ?? []).filter(o => o.user_id === p.id)
    const userBans = (bans ?? []).filter(b => b.user_id === p.id)

    return {
      userId: p.id,
      name: p.name ?? 'Unbekannt',
      email: emailMap.get(p.id) ?? null,
      phone: p.phone,
      hasPass: pass ? (pass.status === 'active' || pass.status === 'trialing') : false,
      passStatus: pass?.status ?? null,
      passEnd: pass?.current_period_end ?? null,
      totalOrders: userOrders.length,
      totalRevenue: userOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
      bans: userBans.map(b => ({
        projectId: b.project_id,
        restaurantName: restaurantMap.get(b.project_id) ?? 'Unbekannt',
        reason: b.ban_reason,
      })),
      createdAt: p.created_at,
    }
  })

  // Filter
  let result = customers
  if (filter === 'pass') result = result.filter(c => c.hasPass)
  if (filter === 'banned') result = result.filter(c => c.bans.length > 0)

  // Suche
  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false)
    )
  }

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ── Restaurants ──────────────────────────────────────────────────────────────

export async function getAdminRestaurants(
  filter: 'all' | 'active' | 'suspended' | 'overdue' = 'all',
  search = ''
): Promise<AdminRestaurant[]> {
  const admin = createAdminClient()

  const { data: projects } = await admin
    .from('projects')
    .select('id, name, slug, user_id, status, is_suspended, suspension_reason, created_at, stripe_charges_enabled, subscription_paid_until')

  if (!projects) return []

  // Owner E-Mails
  const ownerIds = [...new Set(projects.map(p => p.user_id))]
  const { data: { users } } = await admin.auth.admin.listUsers()
  const userMap = new Map(users.map(u => [u.id, u.email ?? null]))

  // Bestellungen & Kunden pro Restaurant
  const { data: orders } = await admin.from('orders').select('project_id, total_amount')
  const { data: customers } = await admin
    .from('restaurant_customers')
    .select('project_id')

  const today = new Date().toISOString().slice(0, 10)

  const restaurants: AdminRestaurant[] = projects.map(p => {
    const projOrders = (orders ?? []).filter(o => o.project_id === p.id)
    const projCustomers = (customers ?? []).filter(c => c.project_id === p.id)

    return {
      id: p.id,
      name: p.name ?? 'Unnamed',
      slug: p.slug ?? null,
      ownerEmail: userMap.get(p.user_id) ?? null,
      planType: p.status ?? 'active',
      subscriptionStatus: p.stripe_charges_enabled ? 'active' : 'pending',
      subscriptionPaidUntil: p.subscription_paid_until ?? null,
      isSuspended: p.is_suspended ?? false,
      suspensionReason: p.suspension_reason ?? null,
      totalOrders: projOrders.length,
      totalRevenue: projOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
      totalCustomers: projCustomers.length,
      createdAt: p.created_at,
    }
  })

  let result = restaurants
  if (filter === 'active') result = result.filter(r => !r.isSuspended)
  if (filter === 'suspended') result = result.filter(r => r.isSuspended)
  if (filter === 'overdue') result = result.filter(r => !r.subscriptionPaidUntil || r.subscriptionPaidUntil < today)

  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.ownerEmail?.toLowerCase().includes(q) ?? false)
    )
  }

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ── Pass-Übersicht ───────────────────────────────────────────────────────────

export async function getAdminPasses(): Promise<AdminPassHolder[]> {
  const admin = createAdminClient()

  const { data: passes } = await admin
    .from('bizzn_pass_subscriptions')
    .select('user_id, status, cancel_at_period_end, current_period_end, created_at, stripe_subscription_id')
    .order('created_at', { ascending: false })

  if (!passes) return []

  // User-Namen & E-Mails
  const userIds = passes.map(p => p.user_id)
  const { data: profiles } = await admin
    .from('customer_profiles')
    .select('id, name')
    .in('id', userIds)
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // E-Mails aus auth.users
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers()
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? null]))

  return passes.map(p => {
    const prof = profileMap.get(p.user_id)
    return {
      userId: p.user_id,
      name: prof?.name ?? 'Unbekannt',
      email: emailMap.get(p.user_id) ?? null,
      status: p.status,
      cancelAtPeriodEnd: p.cancel_at_period_end,
      currentPeriodEnd: p.current_period_end,
      createdAt: p.created_at,
      stripeSubscriptionId: p.stripe_subscription_id,
    }
  })
}

// ── Admin-Aktionen ───────────────────────────────────────────────────────────

export async function adminSuspendRestaurant(
  projectId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update({
      is_suspended: true,
      suspension_reason: reason,
      suspended_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function adminReactivateRestaurant(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update({
      is_suspended: false,
      suspension_reason: null,
      suspended_at: null,
    })
    .eq('id', projectId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function adminSetSubscriptionPaidUntil(
  projectId: string,
  paidUntil: string | null
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update({ subscription_paid_until: paidUntil })
    .eq('id', projectId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function adminUpdateSlug(
  projectId: string,
  newSlug: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const slug = newSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '')
  if (slug.length < 3) return { success: false, error: 'Slug muss mindestens 3 Zeichen lang sein.' }

  // Check uniqueness
  const { data: existing } = await admin.from('projects').select('id').eq('slug', slug).neq('id', projectId).maybeSingle()
  if (existing) return { success: false, error: `Slug "${slug}" ist bereits vergeben.` }

  const { error } = await admin.from('projects').update({ slug }).eq('id', projectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
