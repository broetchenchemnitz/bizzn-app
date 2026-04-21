'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getStripe } from '@/lib/stripe'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingProfileData {
  description?: string | null
  address?: string | null
  phone?: string | null
  cuisine_type?: string | null
  cover_image_url?: string | null
  opening_hours?: Record<string, string> | null
  postal_code?: string | null
  city?: string | null
}

export interface OnboardingChannelData {
  pickup_enabled?: boolean
  delivery_enabled?: boolean
  in_store_enabled?: boolean
  delivery_fee_cents?: number
  min_order_cents?: number
  free_delivery_above_cents?: number
}

export interface OnboardingDiscoveryData {
  city?: string | null
  postal_code?: string | null
  is_public?: boolean
}

// ─── Step 1: Draft-Projekt erstellen ─────────────────────────────────────────

export async function createDraftProject(name: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      user_id: user.id,
      status: 'draft',
      onboarding_step: 1,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Fehler beim Erstellen' }
  return { id: data.id }
}

// ─── Wizard-Fortschritt speichern ─────────────────────────────────────────────

export async function saveOnboardingStep(
  projectId: string,
  step: number,
  data: Record<string, unknown>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { error } = await supabase
    .from('projects')
    .update({ ...data, onboarding_step: step })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

// ─── Slug-Verfügbarkeit prüfen ────────────────────────────────────────────────

export async function checkSlugAvailability(
  slug: string,
  projectId: string
): Promise<{ available: boolean }> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug.toLowerCase())
    .neq('id', projectId)

  return { available: (count ?? 0) === 0 }
}

// ─── Profil speichern (Schritt 3) ─────────────────────────────────────────────

export async function saveOnboardingProfile(
  projectId: string,
  profile: OnboardingProfileData
): Promise<{ error?: string }> {
  return saveOnboardingStep(projectId, 3, profile as Record<string, unknown>)
}

// ─── Slug speichern (Schritt 4) ───────────────────────────────────────────────

export async function saveOnboardingSlug(
  projectId: string,
  slug: string
): Promise<{ error?: string }> {
  return saveOnboardingStep(projectId, 4, { slug: slug.toLowerCase() })
}

// ─── Bestellkanäle speichern (Schritt 5) ──────────────────────────────────────

export async function saveOnboardingChannels(
  projectId: string,
  channels: OnboardingChannelData
): Promise<{ error?: string }> {
  return saveOnboardingStep(projectId, 5, channels as Record<string, unknown>)
}

// ─── Discovery speichern (Schritt 6) ──────────────────────────────────────────

export async function saveOnboardingDiscovery(
  projectId: string,
  discovery: OnboardingDiscoveryData
): Promise<{ error?: string }> {
  return saveOnboardingStep(projectId, 6, discovery as Record<string, unknown>)
}

// ─── Willkommensrabatt speichern (Schritt 7) ──────────────────────────────────

export async function saveOnboardingDiscount(
  projectId: string,
  enabled: boolean,
  pct: number
): Promise<{ error?: string }> {
  return saveOnboardingStep(projectId, 6, {
    welcome_discount_enabled: enabled,
    welcome_discount_pct: pct,
  })
}

// ─── Schritt 9: Go Live (Stripe Checkout erstellen) ──────────────────────────

export async function goLive(projectId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  // Projekt + custom Preis laden
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, custom_monthly_price_cents, trial_ends_at, status')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden' }

  // Trial: Wenn trial_ends_at in der Zukunft liegt → direkt live schalten ohne Zahlung
  if (project.trial_ends_at && new Date(project.trial_ends_at) > new Date()) {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'active', is_public: true, live_since: new Date().toISOString(), onboarding_step: 8 })
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/dashboard')
    return { url: `/dashboard?wizard_success=true&project=${projectId}` }
  }

  // Gratismonat via custom_monthly_price_cents = 0 → ebenfalls direkt live
  if (project.custom_monthly_price_cents === 0) {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'active', is_public: true, live_since: new Date().toISOString(), onboarding_step: 8 })
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/dashboard')
    return { url: `/dashboard?wizard_success=true&project=${projectId}` }
  }

  // Preis ermitteln: custom oder Standard 9900 (99€)
  const unitAmount = project.custom_monthly_price_cents ?? 9900

  // Stripe Checkout Session erstellen
  try {
    const stripe = getStripe()
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.bizzn.de'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Bizzn — Restaurant Live schalten',
              description: `${project.name} auf bizzn.de veröffentlichen`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_creation: 'always',
      success_url: `${origin}/dashboard?wizard_success=true&project=${projectId}`,
      cancel_url: `${origin}/onboarding?project=${projectId}&step=9`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        projectId,
        action: 'go_live',
      },
    })

    if (!session.url) return { error: 'Stripe hat keine Checkout-URL zurückgegeben.' }
    return { url: session.url }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe-Fehler'
    return { error: msg }
  }
}

// ─── Wizard-Daten für bestehendes Projekt laden ───────────────────────────────

export async function loadWizardProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  return data
}
