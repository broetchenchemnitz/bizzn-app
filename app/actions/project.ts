'use server'

import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { roleService } from '@/lib/services/role-service'
import type { Database } from '@/types/supabase'

type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export async function updateProjectName(projectId: string, newName: string) {
  if (!projectId || !newName || newName.trim() === '') {
    return { error: 'Invalid project ID or name.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  // M3: RBAC — nur Owner und Admin dürfen umbenennen
  const canEdit = await roleService.hasPermission(projectId, user.id, ['owner', 'admin'])
  if (!canEdit) {
    return { error: 'Unzureichende Berechtigungen für diese Aktion.' }
  }

  const update: ProjectUpdate = { name: newName.trim() }

  const { error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update project name:', error)
    return { error: 'Fehler beim Umbenennen des Projekts.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/project/${projectId}`)
  return { success: true }
}

export async function deleteProject(projectId: string) {
  if (!projectId) {
    return { error: 'Invalid project ID.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  // Ownership-Check: nur der direkte Owner (projects.user_id) darf löschen
  const { data: ownedProject } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownedProject) {
    return { error: 'Nur der Betriebs-Inhaber kann diesen Betrieb löschen.' }
  }

  // CASCADE DELETE via Admin Client (bypasses RLS)
  // Reihenfolge: abhängige Daten zuerst, dann das Projekt selbst
  try {
    const admin = createAdminClient()

    // 1. Kategorien des Projekts ermitteln
    const { data: categories } = await admin
      .from('menu_categories')
      .select('id')
      .eq('project_id', projectId)

    const categoryIds = (categories ?? []).map((c) => c.id)

    // 2. menu_items löschen (FK auf menu_categories)
    if (categoryIds.length > 0) {
      await admin.from('menu_items').delete().in('category_id', categoryIds)
    }

    // 3. menu_categories löschen
    await admin.from('menu_categories').delete().eq('project_id', projectId)

    // 4. order_items + orders löschen
    const { data: orders } = await admin
      .from('orders')
      .select('id')
      .eq('project_id', projectId)

    const orderIds = (orders ?? []).map((o) => o.id)

    if (orderIds.length > 0) {
      await admin.from('order_items').delete().in('order_id', orderIds)
      await admin.from('orders').delete().in('id', orderIds)
    }

    // 5. project_members löschen
    await admin.from('project_members').delete().eq('project_id', projectId)

    // 6. push_subscriptions löschen
    await admin.from('push_subscriptions').delete().eq('project_id', projectId)

    // 7. Projekt selbst löschen
    const { error } = await admin
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (error) {
      console.error('deleteProject — Supabase error:', JSON.stringify(error))
      return { error: `Fehler beim Löschen des Betriebs: ${error.message}` }
    }
  } catch (e) {
    console.error('deleteProject exception:', e)
    return { error: `Betrieb-Löschung fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// Slug validation: lowercase a-z, 0-9, hyphens — no leading/trailing hyphens
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function updateProjectSlug(projectId: string, rawSlug: string) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const slug = rawSlug.trim().toLowerCase()

  if (!slug) return { error: 'Bitte gib eine Web-Adresse ein.' }
  if (slug.length < 3) return { error: 'Die Web-Adresse muss mindestens 3 Zeichen lang sein.' }
  if (slug.length > 48) return { error: 'Die Web-Adresse darf höchstens 48 Zeichen lang sein.' }
  if (!SLUG_REGEX.test(slug)) {
    return { error: 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt (z. B. mein-restaurant).' }
  }

  // Auth check via user client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  // Ownership check: verify the project belongs to this user
  const { data: owned } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owned) return { error: 'Projekt nicht gefunden oder keine Berechtigung.' }

  // Use admin client to bypass potentially missing RLS UPDATE policy
  const admin = createAdminClient()

  const { error } = await admin
    .from('projects')
    .update({ slug } as ProjectUpdate)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Diese Web-Adresse ist bereits vergeben. Bitte wähle eine andere.' }
    }
    console.error('Failed to update project slug:', error)
    return { error: 'Fehler beim Speichern der Web-Adresse.' }
  }

  revalidatePath(`/dashboard/project/${projectId}`)
  revalidatePath(`/dashboard/project/${projectId}/settings`)
  revalidatePath('/dashboard')
  return { success: true, slug }
}

// ─── M14: Restaurant-Profil aktualisieren ────────────────────────────────────

type ProfileInput = {
  description?: string
  address?: string
  phone?: string
  cuisine_type?: string
  cover_image_url?: string
  opening_hours?: Record<string, string>
}

export async function updateProjectProfile(projectId: string, input: ProfileInput) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  // Nur Owner/Admin dürfen das Profil bearbeiten
  const canEdit = await roleService.hasPermission(projectId, user.id, ['owner', 'admin'])
  if (!canEdit) return { error: 'Unzureichende Berechtigungen.' }

  const admin = createAdminClient()

  const update: ProjectUpdate = {
    description: input.description?.trim() || null,
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    cuisine_type: input.cuisine_type?.trim() || null,
    cover_image_url: input.cover_image_url?.trim() || null,
    opening_hours: (input.opening_hours && Object.keys(input.opening_hours).length > 0)
      ? input.opening_hours
      : null,
  }

  const { error } = await admin
    .from('projects')
    .update(update)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updateProjectProfile error:', error)
    return { error: 'Fehler beim Speichern des Profils.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  revalidatePath(`/dashboard/project/${projectId}`)
  return { success: true }
}

// ─── M16: Willkommensrabatt konfigurieren ────────────────────────────────────

export async function updateWelcomeDiscount(
  projectId: string,
  enabled: boolean,
  pct: number
) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }
  if (pct < 10 || pct > 100) return { error: 'Willkommensrabatt muss mindestens 10 % betragen.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  // Ownership-Check: nur der direkte Projekt-Owner darf Rabatt konfigurieren
  const { data: ownedProject } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownedProject) return { error: 'Unzureichende Berechtigungen.' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('projects')
    .update({
      welcome_discount_enabled: enabled,
      welcome_discount_pct: pct,
    } as Database['public']['Tables']['projects']['Update'])
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updateWelcomeDiscount error:', error)
    return { error: 'Fehler beim Speichern des Rabatts.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { success: true }
}

// ─── M19: Liefergebühr konfigurieren ───────────────────────────────────

export async function updateDeliverySettings(
  projectId: string,
  opts: {
    enabled: boolean
    feeCents: number
    minOrderCents: number
    freeAboveCents: number
  }
) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }
  if (opts.feeCents < 0 || opts.feeCents > 2000) return { error: 'Liefergebühr muss zwischen 0 € und 20 € liegen.' }
  if (opts.minOrderCents < 0 || opts.minOrderCents > 10000) return { error: 'Mindestbestellwert muss zwischen 0 € und 100 € liegen.' }
  if (opts.freeAboveCents < 0 || opts.freeAboveCents > 10000) return { error: 'Gratislieferung ab muss zwischen 0 € und 100 € liegen.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  const { data: ownedProject } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownedProject) return { error: 'Unzureichende Berechtigungen.' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('projects')
    .update({
      delivery_enabled: opts.enabled,
      delivery_fee_cents: opts.feeCents,
      min_order_cents: opts.minOrderCents,
      free_delivery_above_cents: opts.freeAboveCents,
    } as Database['public']['Tables']['projects']['Update'])
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updateDeliverySettings error:', error)
    return { error: 'Fehler beim Speichern der Liefereinstellungen.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { success: true }
}

// ─── M24: Tischbestellung (In-Store) konfigurieren ───────────────────────────

export async function updateInStoreSettings(
  projectId: string,
  enabled: boolean
) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  const { data: ownedProject } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownedProject) return { error: 'Unzureichende Berechtigungen.' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('projects')
    .update({
      in_store_enabled: enabled,
    } as Database['public']['Tables']['projects']['Update'])
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updateInStoreSettings error:', error)
    return { error: 'Fehler beim Speichern der Tischbestellungs-Einstellungen.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { success: true }
}

// ─── M24b: Abholzeit-Slots (Auto-Generator) ───────────────────────────────────

/** Toggle: Abholzeit-Slots aktivieren/deaktivieren */
export async function updatePickupSlotsEnabled(
  projectId: string,
  enabled: boolean
) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update({ pickup_slots_enabled: enabled } as Database['public']['Tables']['projects']['Update'])
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updatePickupSlotsEnabled error:', error)
    return { error: 'Fehler beim Speichern.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { success: true }
}

/** Konfiguration: Vorlaufzeit, Raster, Max-pro-Slot */
export async function updatePickupSlotsSettings(
  projectId: string,
  settings: {
    prep_time_minutes: number
    slot_interval_minutes: number
    max_orders_per_slot: number | null
  }
) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update(settings as Database['public']['Tables']['projects']['Update'])
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updatePickupSlotsSettings error:', error)
    return { error: 'Fehler beim Speichern der Slot-Einstellungen.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { success: true }
}

// ─── M27: Allgemeiner Projekt-Settings-Update (für kleinere Toggle-Features) ──

export async function updateProjectSettings(
  projectId: string,
  settings: Partial<Pick<Database['public']['Tables']['projects']['Row'],
    'drive_in_enabled'
  >>
) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  const { data: ownedProject } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownedProject) return { error: 'Unzureichende Berechtigungen.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update(settings as ProjectUpdate)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updateProjectSettings error:', error)
    return { error: 'Fehler beim Speichern der Einstellung.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { success: true }
}

// ─── M25: Online-Zahlung Toggle ───────────────────────────────────────────────

export async function updateOnlinePaymentEnabled(
  projectId: string,
  enabled: boolean
) {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert.' }

  const { data: ownedProject } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownedProject) return { error: 'Unzureichende Berechtigungen.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update({ online_payment_enabled: enabled } as Database['public']['Tables']['projects']['Update'])
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('updateOnlinePaymentEnabled error:', error)
    return { error: 'Fehler beim Speichern der Zahlungseinstellung.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { success: true }
}
