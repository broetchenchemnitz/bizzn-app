'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendNewReviewNotification } from '@/lib/email'
import { createAdminClient } from '@/utils/supabase/admin'

// ─── Wizard: Antrag einreichen → pending_review ───────────────────────────────

export async function submitForReview(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  // Projekt laden (ownership check)
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, city, status')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden' }
  if (project.status !== 'draft') return { error: 'Projekt ist nicht im Draft-Status' }

  // Status auf pending_review setzen + Preview sperren
  const { error } = await supabase
    .from('projects')
    .update({
      status: 'pending_review',
      preview_token: null,   // Vorschau während Prüfung deaktivieren
      onboarding_step: 8,
    })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // E-Mail an Superadmin senden (non-blocking)
  try {
    await sendNewReviewNotification({
      restaurantName: project.name,
      ownerEmail: user.email ?? '—',
      projectId,
      city: project.city,
    })
  } catch (emailErr) {
    console.error('[M32] Superadmin notification failed:', emailErr)
    // Non-fatal: we still return success
  }

  revalidatePath('/dashboard')
  return {}
}

// ─── Dashboard: Online gehen (approved + 0€ oder nach Stripe) ───────────────

export async function goOnline(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: project } = await supabase
    .from('projects')
    .select('id, status, custom_monthly_price_cents')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden' }
  if (!['approved', 'inactive'].includes(project.status)) {
    return { error: 'Projekt muss freigegeben sein, um online zu gehen' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'active',
      is_public: true,
      live_since: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}

// ─── Dashboard: Offline gehen ────────────────────────────────────────────────

export async function goOffline(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'inactive',
      is_public: false,
    })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}

// ─── Dashboard: Stripe-Checkout für approved + Preis > 0 ─────────────────────

export async function goOnlinePaid(projectId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, custom_monthly_price_cents')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden' }
  if (project.status !== 'approved') return { error: 'Projekt nicht freigegeben' }

  const unitAmount = project.custom_monthly_price_cents ?? 9900

  // Importiere Stripe lazy
  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.bizzn.de'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Bizzn — Restaurant Live schalten',
            description: `${project.name} auf bizzn.de veröffentlichen`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_creation: 'always',
      success_url: `${origin}/api/stripe/go-live-success?project=${projectId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { userId: user.id, projectId, action: 'go_live_approved' },
    })

    if (!session.url) return { error: 'Stripe hat keine Checkout-URL zurückgegeben.' }
    return { url: session.url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Stripe-Fehler' }
  }
}

// ─── Superadmin: Projekt freigeben ───────────────────────────────────────────

export async function approveProject(
  projectId: string,
  opts: {
    customPriceCents: number
    trialEndsAt: string | null
    note: string | null
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    return { error: 'Nicht autorisiert' }
  }

  const admin = createAdminClient()

  // Projekt + Owner laden
  const { data: project } = await admin
    .from('projects')
    .select('id, name, user_id, status, custom_monthly_price_cents, trial_ends_at')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden' }
  if (project.status !== 'pending_review') return { error: 'Projekt ist nicht im pending_review Status' }

  // Owner-E-Mail laden
  const { data: ownerData } = await admin.auth.admin.getUserById(project.user_id)
  const ownerEmail = ownerData?.user?.email

  // Projekt freigeben
  const { error } = await admin
    .from('projects')
    .update({
      status: 'approved',
      custom_monthly_price_cents: opts.customPriceCents,
      trial_ends_at: opts.trialEndsAt,
      approved_at: new Date().toISOString(),
      approved_by: user.email,
      superadmin_note: opts.note ?? null,
    })
    .eq('id', projectId)

  if (error) return { error: error.message }

  // Freigabe-E-Mail an Gastronom
  if (ownerEmail) {
    try {
      const { sendApprovalEmail } = await import('@/lib/email')
      await sendApprovalEmail({
        to: ownerEmail,
        restaurantName: project.name,
        customPriceCents: opts.customPriceCents,
        trialEndsAt: opts.trialEndsAt,
      })
    } catch (emailErr) {
      console.error('[M32] Approval email failed:', emailErr)
    }
  }

  revalidatePath('/superadmin')
  return {}
}

// ─── Superadmin: Ablehnen ────────────────────────────────────────────────────

export async function rejectProject(
  projectId: string,
  reason: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    return { error: 'Nicht autorisiert' }
  }

  const admin = createAdminClient()

  const { data: project } = await admin
    .from('projects')
    .select('id, name, user_id, status')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden' }

  // Reset to draft so they can fix and resubmit
  const { error } = await admin
    .from('projects')
    .update({
      status: 'draft',
      superadmin_note: `[ABGELEHNT] ${reason}`,
    })
    .eq('id', projectId)

  if (error) return { error: error.message }

  const { data: ownerData } = await admin.auth.admin.getUserById(project.user_id)
  const ownerEmail = ownerData?.user?.email

  if (ownerEmail) {
    try {
      const { sendRejectionEmail } = await import('@/lib/email')
      await sendRejectionEmail({ to: ownerEmail, restaurantName: project.name, reason })
    } catch (emailErr) {
      console.error('[M32] Rejection email failed:', emailErr)
    }
  }

  revalidatePath('/superadmin')
  return {}
}
