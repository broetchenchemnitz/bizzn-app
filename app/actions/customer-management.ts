'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import type { Database } from '@/types/supabase'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAdmin() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Prüft ob der aktuelle User Owner des Projekts ist */
async function verifyOwnership(projectId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('verifyOwnership: auth error:', authError.message)
  }
  if (!user) {
    console.error('verifyOwnership: no user found in session')
    return null
  }

  const admin = getAdmin()
  const { data: project, error: projError } = await admin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projError) {
    console.error('verifyOwnership: project query error:', projError.message, 'userId:', user.id)
  }

  return project ? user.id : null
}

// ---------------------------------------------------------------------------
// 1. Barzahlungs-Sperre aufheben
// ---------------------------------------------------------------------------

export async function unblockCashPayment(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const ownerId = await verifyOwnership(projectId)
  if (!ownerId) return { success: false, error: 'Keine Berechtigung.' }

  const admin = getAdmin()
  const { error } = await admin
    .from('customer_profiles')
    .update({
      is_blacklisted: false,
      blacklist_reason: null,
      blacklisted_at: null,
    })
    .eq('id', userId)

  if (error) {
    console.error('unblockCashPayment error:', error)
    return { success: false, error: 'Fehler beim Entsperren.' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// 2. Kunde für Restaurant sperren
// ---------------------------------------------------------------------------

export async function banCustomer(
  projectId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const ownerId = await verifyOwnership(projectId)
  if (!ownerId) return { success: false, error: 'Keine Berechtigung.' }
  if (!reason.trim()) return { success: false, error: 'Bitte gib einen Grund an.' }

  const admin = getAdmin()

  // Gastronom-Name laden
  const { data: ownerProfile } = await admin
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  // Prüfe ob Eintrag in restaurant_customers existiert
  const { data: existing } = await admin
    .from('restaurant_customers')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Update bestehenden Eintrag
    const { error } = await admin
      .from('restaurant_customers')
      .update({
        is_banned: true,
        ban_reason: reason.trim(),
        banned_at: new Date().toISOString(),
        banned_by: ownerProfile?.name ?? 'Restaurant',
      })
      .eq('id', existing.id)

    if (error) {
      console.error('banCustomer update error:', error)
      return { success: false, error: 'Fehler beim Sperren.' }
    }
  } else {
    // Kunde hat bestellt aber ist nicht registriert → Eintrag anlegen
    const { error } = await admin
      .from('restaurant_customers')
      .insert({
        project_id: projectId,
        user_id: userId,
        is_banned: true,
        ban_reason: reason.trim(),
        banned_at: new Date().toISOString(),
        banned_by: ownerProfile?.name ?? 'Restaurant',
      })

    if (error) {
      console.error('banCustomer insert error:', error)
      return { success: false, error: 'Fehler beim Sperren.' }
    }
  }

  // Auth-Level Ban: Supabase verweigert JEDE Authentifizierung für diesen User
  // Das ist die einzige 100% sichere Methode — kein App-Code kann das umgehen
  try {
    await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' }) // ~100 Jahre = permanent
    console.log(`banCustomer: User ${userId} auf Auth-Level gesperrt`)
  } catch (e) {
    console.warn('banCustomer: Auth-Level-Ban fehlgeschlagen:', e)
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// 3. Kunde für Restaurant entsperren
// ---------------------------------------------------------------------------

export async function unbanCustomer(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const ownerId = await verifyOwnership(projectId)
  if (!ownerId) return { success: false, error: 'Keine Berechtigung.' }

  const admin = getAdmin()
  const { error } = await admin
    .from('restaurant_customers')
    .update({
      is_banned: false,
      ban_reason: null,
      banned_at: null,
      banned_by: null,
    })
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) {
    console.error('unbanCustomer error:', error)
    return { success: false, error: 'Fehler beim Entsperren.' }
  }

  // Auth-Level Ban aufheben → User kann sich wieder einloggen
  try {
    await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    console.log(`unbanCustomer: Auth-Level-Ban für User ${userId} aufgehoben`)
  } catch (e) {
    console.warn('unbanCustomer: Auth-Level-Unban fehlgeschlagen:', e)
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// 4. Kunden-Details laden (für Dashboard)
// ---------------------------------------------------------------------------

export type CustomerDetail = {
  customerNumber: number
  userId: string
  name: string
  email: string | null
  phone: string | null
  registeredAt: string
  // Bestellhistorie
  orderCount: number
  totalRevenueCents: number
  lastOrderAt: string | null
  // Sperr-Status
  isCashBlacklisted: boolean
  cashBlacklistReason: string | null
  cashBlacklistedAt: string | null
  isBanned: boolean
  banReason: string | null
  bannedAt: string | null
  // Sperren bei anderen Restaurants
  otherBans: { restaurantName: string; reason: string; type: 'ban' | 'cash_blacklist' }[]
  // Loyalty
  loyaltyBalanceCents: number
  loyaltyOrderCount: number
  // Bizzn Pass
  hasPass: boolean
  // Marketing
  pushOptIn: boolean
  emailOptIn: boolean
}

export async function getCustomersForProject(
  projectId: string
): Promise<{ customers: CustomerDetail[]; error?: string }> {
  const ownerId = await verifyOwnership(projectId)
  if (!ownerId) return { customers: [], error: 'Keine Berechtigung.' }

  const admin = getAdmin()

  // 1. Restaurant-Kunden laden (Ban-Spalten optional — falls Migration noch nicht gelaufen)
  let rcRows: any[] = []
  const { data: rcData, error: rcError } = await admin
    .from('restaurant_customers')
    .select('user_id, marketing_consent_push, marketing_consent_email, created_at, is_banned, ban_reason, banned_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (rcError && rcError.message.includes('is_banned')) {
    console.warn('Ban columns not yet migrated, loading without ban fields')
    const { data: fallback } = await admin
      .from('restaurant_customers')
      .select('user_id, marketing_consent_push, marketing_consent_email, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    rcRows = (fallback ?? []).map(r => ({ ...r, is_banned: false, ban_reason: null, banned_at: null }))
  } else {
    rcRows = rcData ?? []
  }

  // 1b. Auch Kunden aus orders laden, die nicht in restaurant_customers sind (z.B. No-Show-Gesperrte)
  const registeredUserIds = new Set(rcRows.map(r => r.user_id))
  const { data: orderUsers } = await admin
    .from('orders')
    .select('user_id')
    .eq('project_id', projectId)
    .not('user_id', 'is', null)

  const extraUserIds = [...new Set((orderUsers ?? []).map(o => o.user_id).filter(id => id && !registeredUserIds.has(id)))]
  for (const uid of extraUserIds) {
    rcRows.push({
      user_id: uid,
      marketing_consent_push: false,
      marketing_consent_email: false,
      created_at: new Date().toISOString(),
      is_banned: false,
      ban_reason: null,
      banned_at: null,
    })
  }

  if (rcRows.length === 0) return { customers: [] }

  const userIds = rcRows.map(r => r.user_id)

  // 2. Kundenprofile
  const { data: profiles } = await admin
    .from('customer_profiles')
    .select('id, name, phone, is_blacklisted, blacklist_reason, blacklisted_at')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // 3. E-Mails aus auth.users
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const emailMap = new Map(authUsers.users.map(u => [u.id, u.email ?? null]))

  // 4. Bestellhistorie
  const { data: orders } = await admin
    .from('orders')
    .select('user_id, total_amount, created_at')
    .eq('project_id', projectId)
    .in('user_id', userIds)

  const orderStats = new Map<string, { count: number; revenue: number; lastAt: string | null }>()
  for (const o of orders ?? []) {
    const stat = orderStats.get(o.user_id) ?? { count: 0, revenue: 0, lastAt: null }
    stat.count++
    stat.revenue += o.total_amount
    if (!stat.lastAt || o.created_at > stat.lastAt) stat.lastAt = o.created_at
    orderStats.set(o.user_id, stat)
  }

  // 5. Loyalty-Balances
  const { data: loyaltyRows } = await admin
    .from('loyalty_balances')
    .select('user_id, balance_cents, order_count')
    .eq('project_id', projectId)
    .in('user_id', userIds)

  const loyaltyMap = new Map((loyaltyRows ?? []).map(l => [l.user_id, l]))

  // 5b. Bizzn Pass Status
  const { data: passRows } = await admin
    .from('bizzn_pass_subscriptions')
    .select('user_id, status')
    .in('user_id', userIds)
    .eq('status', 'active')

  const passSet = new Set((passRows ?? []).map(p => p.user_id))

  // 6. Sperren bei anderen Restaurants (robust gegen fehlende Ban-Spalten)
  let allBans: any[] = []
  const { data: banData, error: banError } = await admin
    .from('restaurant_customers')
    .select('user_id, project_id, is_banned, ban_reason')
    .in('user_id', userIds)
    .neq('project_id', projectId)
  if (!banError) allBans = banData ?? []

  // Projekt-Namen für andere Sperren
  const otherProjectIds = [...new Set((allBans ?? []).filter(b => b.is_banned).map(b => b.project_id))]
  const { data: otherProjects } = otherProjectIds.length > 0
    ? await admin.from('projects').select('id, name').in('id', otherProjectIds)
    : { data: [] }
  const projectNameMap = new Map((otherProjects ?? []).map(p => [p.id, p.name]))

  // 7. Zusammenführen
  // Kundennummern vergeben: ältester Kunde = #1 (rcRows sind ascending sortiert)
  const customers: CustomerDetail[] = rcRows.map((rc, index) => {
    const profile = profileMap.get(rc.user_id)
    const stats = orderStats.get(rc.user_id) ?? { count: 0, revenue: 0, lastAt: null }
    const loyalty = loyaltyMap.get(rc.user_id)

    // Andere Sperren sammeln
    const otherBans: CustomerDetail['otherBans'] = []
    for (const ban of allBans ?? []) {
      if (ban.user_id === rc.user_id && ban.is_banned) {
        otherBans.push({
          restaurantName: projectNameMap.get(ban.project_id) ?? 'Unbekannt',
          reason: ban.ban_reason ?? 'Kein Grund angegeben',
          type: 'ban',
        })
      }
    }
    // Cash-Blacklist als Hinweis
    if (profile?.is_blacklisted) {
      otherBans.push({
        restaurantName: 'Plattform',
        reason: profile.blacklist_reason ?? 'No-Show',
        type: 'cash_blacklist',
      })
    }

    return {
      customerNumber: index + 1001,
      userId: rc.user_id,
      name: profile?.name ?? 'Unbekannt',
      email: emailMap.get(rc.user_id) ?? null,
      phone: profile?.phone ?? null,
      registeredAt: rc.created_at,
      orderCount: stats.count,
      totalRevenueCents: stats.revenue,
      lastOrderAt: stats.lastAt,
      isCashBlacklisted: profile?.is_blacklisted ?? false,
      cashBlacklistReason: profile?.blacklist_reason ?? null,
      cashBlacklistedAt: profile?.blacklisted_at ?? null,
      isBanned: rc.is_banned ?? false,
      banReason: rc.ban_reason ?? null,
      bannedAt: rc.banned_at ?? null,
      otherBans,
      loyaltyBalanceCents: loyalty?.balance_cents ?? 0,
      loyaltyOrderCount: loyalty?.order_count ?? 0,
      hasPass: passSet.has(rc.user_id),
      pushOptIn: rc.marketing_consent_push,
      emailOptIn: rc.marketing_consent_email,
    }
  })

  // Für die Anzeige: neueste Kunden zuerst
  customers.reverse()

  return { customers }
}
