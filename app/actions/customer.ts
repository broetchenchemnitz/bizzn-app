'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

import { normalizePhone } from '@/lib/validation'

// ─── Supabase Client Helper (Kundenkontext) ──────────────────────────────────

export async function createCustomerSupabase() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
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
}

// ─── Typen ────────────────────────────────────────────────────────────────────

export type CustomerAuthResult =
  | { success: true; userId: string }
  | { error: string }

// ─── Kunden-Registrierung ─────────────────────────────────────────────────────

export async function signUpCustomer(input: {
  projectId: string
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  consentPush: boolean
  consentEmail: boolean
}): Promise<CustomerAuthResult> {
  const { projectId, firstName, lastName, email, password, phone, consentPush, consentEmail } = input
  const fullName = `${firstName.trim()} ${lastName.trim()}`

  if (!firstName.trim()) return { error: 'Bitte gib deinen Vornamen ein.' }
  if (!lastName.trim()) return { error: 'Bitte gib deinen Nachnamen ein.' }
  if (!email.trim()) return { error: 'Bitte gib deine E-Mail ein.' }
  if (password.length < 6) return { error: 'Passwort muss mindestens 6 Zeichen haben.' }

  // ── Telefonnummer-Duplikat prüfen ──────────────────────────────────────────
  if (phone?.trim()) {
    const normalized = normalizePhone(phone.trim())
    const admin = createSupabaseAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: existing } = await admin
      .from('customer_profiles')
      .select('id, phone')
      .not('phone', 'is', null)

    if (existing?.length) {
      const duplicate = existing.find(row => row.phone && normalizePhone(row.phone) === normalized)
      if (duplicate) {
        return { error: 'Diese Telefonnummer ist bereits registriert. Bitte melde dich an oder verwende eine andere Nummer.' }
      }
    }
  }

  const supabase = await createCustomerSupabase()

  // 1. Supabase Auth Registration
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        role: 'customer',
        name: fullName,
      },
    },
  })

  if (authError) {
    console.error('signUpCustomer auth error:', authError)
    if (
      authError.message.includes('already registered') ||
      authError.message.includes('User already registered')
    ) {
      return { error: 'Diese E-Mail ist bereits registriert. Bitte melde dich an.' }
    }
    return { error: authError.message }
  }

  const userId = authData.user?.id
  if (!userId) return { error: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.' }

  // 2. Kundenprofil anlegen (Admin-Client — RLS blockiert Kunden-Schreibzugriff)
  const admin = createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error: profileError } = await admin
    .from('customer_profiles')
    .insert({
      id: userId,
      name: fullName,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone?.trim() || null,
    })

  if (profileError && profileError.code !== '23505') {
    console.error('signUpCustomer profile error:', profileError)
    // Kein harter Fehler — Auth ist trotzdem erstellt
  }

  // 4. Restaurant-Kunden-Beziehung anlegen
  if (projectId) {
    const { error: rcError } = await admin
      .from('restaurant_customers')
      .insert({
        project_id: projectId,
        user_id: userId,
        marketing_consent_push: consentPush,
        marketing_consent_email: consentEmail,
      })

    if (rcError && rcError.code !== '23505') {
      console.error('signUpCustomer restaurant_customers error:', rcError)
    }
  }

  return { success: true, userId }
}

// ─── Kunden-Login ─────────────────────────────────────────────────────────────

export async function signInCustomer(input: {
  projectId: string
  email: string
  password: string
}): Promise<CustomerAuthResult> {
  const { projectId, email, password } = input

  const supabase = await createCustomerSupabase()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      return { error: 'E-Mail oder Passwort falsch.' }
    }
    return { error: authError.message }
  }

  const userId = authData.user?.id
  if (!userId) return { error: 'Login fehlgeschlagen.' }

  // Restaurant-Level Ban prüfen
  {
    const admin = createSupabaseAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (projectId) {
      // Spezifisches Restaurant prüfen
      const { data: banCheck } = await admin
        .from('restaurant_customers')
        .select('is_banned, ban_reason')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle()

      if (banCheck?.is_banned) {
        await supabase.auth.signOut()
        return { error: `Dein Konto ist bei diesem Restaurant gesperrt.${banCheck.ban_reason ? ` Grund: ${banCheck.ban_reason}` : ''} Bitte kontaktiere das Restaurant.` }
      }
    } else {
      // Kein projectId (z.B. /mein-konto) → prüfe ob bei IRGENDEINEM Restaurant gesperrt
      const { data: anyBan } = await admin
        .from('restaurant_customers')
        .select('is_banned, ban_reason')
        .eq('user_id', userId)
        .eq('is_banned', true)
        .limit(1)
        .maybeSingle()

      if (anyBan?.is_banned) {
        await supabase.auth.signOut()
        return { error: `Dein Konto ist gesperrt.${anyBan.ban_reason ? ` Grund: ${anyBan.ban_reason}` : ''} Bitte kontaktiere das Restaurant.` }
      }
    }
  }

  // Stelle sicher, dass restaurant_customers-Eintrag existiert (upsert via Admin)
  if (projectId) {
    const adminForUpsert = createSupabaseAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminForUpsert
      .from('restaurant_customers')
      .upsert(
        { project_id: projectId, user_id: userId },
        { onConflict: 'project_id,user_id', ignoreDuplicates: true }
      )
  }

  return { success: true, userId }
}

// ─── Aktuelle Kunden-Session lesen ────────────────────────────────────────────

export async function getCustomerSession(): Promise<{
  userId: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}> {
  const supabase = await createCustomerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { userId: null, name: null, firstName: null, lastName: null, email: null, phone: null }

  const name = (user.user_metadata?.name as string | undefined) ?? null

  // Profil-Daten aus customer_profiles lesen (Admin-Client wegen RLS)
  const admin = createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await admin
    .from('customer_profiles')
    .select('phone, first_name, last_name')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    name,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    email: user.email ?? null,
    phone: profile?.phone ?? null,
  }
}

// ─── Kunden-Logout ────────────────────────────────────────────────────────────

export async function signOutCustomer(): Promise<void> {
  const supabase = await createCustomerSupabase()
  await supabase.auth.signOut()
}

// ─── M26: No-Show Blacklist prüfen ───────────────────────────────────────────

/**
 * Prüft ob ein Kunde gesperrt ist (Barzahlungs-Blacklist).
 * Gibt null zurück wenn OK, sonst Sperr-Grund.
 */
export async function checkNoShowBlacklist(userId: string): Promise<string | null> {
  if (!userId) return null
  const admin = createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin
    .from('customer_profiles')
    .select('is_blacklisted, blacklist_reason')
    .eq('id', userId)
    .single()
  if (data?.is_blacklisted) {
    return data.blacklist_reason ?? 'Dein Konto ist für Barzahlung gesperrt. Bitte kontaktiere das Restaurant.'
  }
  return null
}

/**
 * Liest den Barzahlungs-Bestellzähler eines Kunden (für den 30€-Deckel).
 * < 3 Bestellungen = Neukunde → Limit aktiv.
 */
export async function getCashOrderCount(userId: string): Promise<number> {
  if (!userId) return 0
  const admin = createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin
    .from('customer_profiles')
    .select('cash_order_count')
    .eq('id', userId)
    .single()
  return data?.cash_order_count ?? 0
}
