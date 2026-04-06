'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// ─── Supabase Client Helper (Kundenkontext) ──────────────────────────────────

async function createCustomerSupabase() {
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
  name: string
  email: string
  password: string
  phone?: string
  consentPush: boolean
  consentEmail: boolean
}): Promise<CustomerAuthResult> {
  const { projectId, name, email, password, phone, consentPush, consentEmail } = input

  if (!name.trim()) return { error: 'Bitte gib deinen Namen ein.' }
  if (!email.trim()) return { error: 'Bitte gib deine E-Mail ein.' }
  if (password.length < 6) return { error: 'Passwort muss mindestens 6 Zeichen haben.' }

  const supabase = await createCustomerSupabase()

  // 1. Supabase Auth Registration (no email confirm — Auto-Confirm muss in Supabase aktiviert sein)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        role: 'customer',
        name: name.trim(),
      },
    },
  })

  if (authError) {
    console.error('signUpCustomer auth error:', authError)
    if (authError.message.includes('already registered')) {
      return { error: 'Diese E-Mail ist bereits registriert. Bitte melde dich an.' }
    }
    return { error: authError.message }
  }

  const userId = authData.user?.id
  if (!userId) return { error: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.' }

  // 2. Kundenprofil anlegen
  const { error: profileError } = await supabase
    .from('customer_profiles')
    .insert({
      id: userId,
      name: name.trim(),
      phone: phone?.trim() || null,
    })

  if (profileError) {
    console.error('signUpCustomer profile error:', profileError)
    // Kein harter Fehler — Auth ist trotzdem erstellt
  }

  // 3. Restaurant-Kunden-Beziehung anlegen
  const { error: rcError } = await supabase
    .from('restaurant_customers')
    .insert({
      project_id: projectId,
      user_id: userId,
      marketing_consent_push: consentPush,
      marketing_consent_email: consentEmail,
    })

  if (rcError && rcError.code !== '23505') {
    // 23505 = unique_violation (bereits registriert bei diesem Restaurant — kein Problem)
    console.error('signUpCustomer restaurant_customers error:', rcError)
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

  // Stelle sicher, dass restaurant_customers-Eintrag existiert (upsert)
  await supabase
    .from('restaurant_customers')
    .upsert(
      { project_id: projectId, user_id: userId },
      { onConflict: 'project_id,user_id', ignoreDuplicates: true }
    )

  return { success: true, userId }
}

// ─── Aktuelle Kunden-Session lesen ────────────────────────────────────────────

export async function getCustomerSession(): Promise<{
  userId: string | null
  name: string | null
  email: string | null
}> {
  const supabase = await createCustomerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { userId: null, name: null, email: null }

  const name = (user.user_metadata?.name as string | undefined) ?? null

  return {
    userId: user.id,
    name,
    email: user.email ?? null,
  }
}

// ─── Kunden-Logout ────────────────────────────────────────────────────────────

export async function signOutCustomer(): Promise<void> {
  const supabase = await createCustomerSupabase()
  await supabase.auth.signOut()
}
