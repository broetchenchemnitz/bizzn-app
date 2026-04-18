'use server'

import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/supabase'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type OptionGroup = Database['public']['Tables']['menu_option_groups']['Row']
type MenuOption = Database['public']['Tables']['menu_options']['Row']

// Admin client for M28 writes (RLS only allows anon reads on option tables)
function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface CreateMenuItemData {
  name: string
  description: string
  price: number   // in cents
  is_active: boolean
}

interface UpdateMenuItemData {
  name?: string
  description?: string
  price?: number  // in cents
  is_active?: boolean
}

export async function getMenuCategories(projectId: string): Promise<{ data: MenuCategory[] | null; error: string | null }> {
  if (!projectId) return { data: null, error: 'Invalid project ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch menu categories:', error)
    return { data: null, error: 'Fehler beim Laden der Kategorien.' }
  }

  return { data, error: null }
}

export async function getCategory(categoryId: string): Promise<{ data: MenuCategory | null; error: string | null }> {
  if (!categoryId) return { data: null, error: 'Invalid category ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('id', categoryId)
    .single<MenuCategory>()

  if (error) {
    console.error('Failed to fetch category:', error)
    return { data: null, error: 'Kategorie nicht gefunden.' }
  }

  return { data, error: null }
}

export async function getMenuItems(categoryId: string): Promise<{ data: MenuItem[] | null; error: string | null }> {
  if (!categoryId) return { data: null, error: 'Invalid category ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch menu items:', error)
    return { data: null, error: 'Fehler beim Laden der Speisen.' }
  }

  return { data, error: null }
}

export async function createMenuCategory(projectId: string, name: string): Promise<{ error: string | null }> {
  if (!projectId || !name.trim()) return { error: 'Ungültige Eingabe.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden oder kein Zugriff.' }

  const { error } = await supabase
    .from('menu_categories')
    .insert({ project_id: projectId, name: name.trim() })

  if (error) {
    console.error('Failed to create menu category:', error)
    return { error: 'Fehler beim Erstellen der Kategorie.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

export async function updateMenuCategory(categoryId: string, name: string): Promise<{ error: string | null }> {
  if (!categoryId || !name.trim()) return { error: 'Ungültige Eingabe.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { data: category, error: fetchError } = await supabase
    .from('menu_categories')
    .select('id, project_id')
    .eq('id', categoryId)
    .single()

  if (fetchError || !category) return { error: 'Kategorie nicht gefunden.' }

  // Ownership check via project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', category.project_id)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Kein Zugriff.' }

  const { error } = await supabase
    .from('menu_categories')
    .update({ name: name.trim() })
    .eq('id', categoryId)

  if (error) {
    console.error('Failed to update menu category:', error)
    return { error: 'Fehler beim Aktualisieren der Kategorie.' }
  }

  revalidatePath(`/dashboard/project/${category.project_id}/menu`)
  return { error: null }
}

export async function deleteMenuCategory(categoryId: string, projectId: string): Promise<{ error: string | null }> {
  if (!categoryId || !projectId) return { error: 'Ungültige Eingabe.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  // Ownership check
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Kein Zugriff.' }

  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId)
    .eq('project_id', projectId)

  if (error) {
    console.error('Failed to delete menu category:', error)
    return { error: 'Fehler beim Löschen der Kategorie.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

export async function createMenuItem(categoryId: string, itemData: CreateMenuItemData): Promise<{ error: string | null }> {
  if (!categoryId || !itemData.name.trim()) return { error: 'Ungültige Eingabe.' }
  if (!Number.isInteger(itemData.price) || itemData.price < 0) return { error: 'Ungültiger Preis.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  // Ownership-Check: categoryId muss zu einem eigenen Projekt gehören
  const { data: category } = await supabase
    .from('menu_categories')
    .select('id, project_id')
    .eq('id', categoryId)
    .single()

  if (!category) return { error: 'Kategorie nicht gefunden.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', category.project_id)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Kein Zugriff auf diese Kategorie.' }

  const { error } = await supabase
    .from('menu_items')
    .insert({
      category_id: categoryId,
      name: itemData.name.trim(),
      description: itemData.description.trim(),
      price: itemData.price,
      is_active: itemData.is_active,
    })

  if (error) {
    console.error('Failed to create menu item:', error)
    return { error: 'Fehler beim Erstellen der Speise.' }
  }

  revalidatePath(`/dashboard/project/${category.project_id}/menu`)
  return { error: null }
}

export async function updateMenuItem(itemId: string, itemData: UpdateMenuItemData): Promise<{ error: string | null }> {
  if (!itemId) return { error: 'Ungültige Item-ID.' }
  if (itemData.price !== undefined && (!Number.isInteger(itemData.price) || itemData.price < 0)) {
    return { error: 'Ungültiger Preis.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  // Ownership-Chain: menu_items → menu_categories → projects.user_id
  const { data: item } = await supabase
    .from('menu_items')
    .select('id, category_id')
    .eq('id', itemId)
    .single()

  if (!item) return { error: 'Speise nicht gefunden.' }

  const { data: category } = await supabase
    .from('menu_categories')
    .select('id, project_id')
    .eq('id', item.category_id)
    .single()

  if (!category) return { error: 'Kategorie nicht gefunden.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', category.project_id)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Kein Zugriff auf diese Speise.' }

  const updatePayload: UpdateMenuItemData = {}
  if (itemData.name !== undefined) updatePayload.name = itemData.name.trim()
  if (itemData.description !== undefined) updatePayload.description = itemData.description.trim()
  if (itemData.price !== undefined) updatePayload.price = itemData.price
  if (itemData.is_active !== undefined) updatePayload.is_active = itemData.is_active

  const { error } = await supabase
    .from('menu_items')
    .update(updatePayload)
    .eq('id', itemId)

  if (error) {
    console.error('Failed to update menu item:', error)
    return { error: 'Fehler beim Aktualisieren der Speise.' }
  }

  revalidatePath(`/dashboard/project/${category.project_id}/menu`)
  return { error: null }
}

export async function deleteMenuItem(itemId: string): Promise<{ error: string | null }> {
  if (!itemId) return { error: 'Ungültige Item-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  // Ownership-Chain: menu_items → menu_categories → projects.user_id
  const { data: item } = await supabase
    .from('menu_items')
    .select('id, category_id')
    .eq('id', itemId)
    .single()

  if (!item) return { error: 'Speise nicht gefunden.' }

  const { data: category } = await supabase
    .from('menu_categories')
    .select('id, project_id')
    .eq('id', item.category_id)
    .single()

  if (!category) return { error: 'Kategorie nicht gefunden.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', category.project_id)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Kein Zugriff auf diese Speise.' }

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Failed to delete menu item:', error)
    return { error: 'Fehler beim Löschen der Speise.' }
  }

  revalidatePath(`/dashboard/project/${category.project_id}/menu`)
  return { error: null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// M28: Optionsgruppen & Optionen CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Helper: Prüft ob ein menu_item dem eingeloggten User gehört. Gibt projectId zurück. */
async function verifyMenuItemOwnership(menuItemId: string): Promise<{ projectId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { projectId: null, error: 'Not authenticated.' }

  const { data: item } = await supabase
    .from('menu_items')
    .select('id, category_id')
    .eq('id', menuItemId)
    .single()
  if (!item) return { projectId: null, error: 'Speise nicht gefunden.' }

  const { data: category } = await supabase
    .from('menu_categories')
    .select('id, project_id')
    .eq('id', item.category_id)
    .single()
  if (!category) return { projectId: null, error: 'Kategorie nicht gefunden.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', category.project_id)
    .eq('user_id', user.id)
    .single()
  if (!project) return { projectId: null, error: 'Kein Zugriff.' }

  return { projectId: project.id, error: null }
}

/** Helper: Prüft ob eine Optionsgruppe dem eingeloggten User gehört. */
async function verifyOptionGroupOwnership(groupId: string): Promise<{ projectId: string | null; menuItemId: string | null; error: string | null }> {
  const admin = createAdminClient()
  const { data: group } = await admin
    .from('menu_option_groups')
    .select('id, menu_item_id')
    .eq('id', groupId)
    .single()
  if (!group) return { projectId: null, menuItemId: null, error: 'Optionsgruppe nicht gefunden.' }

  const result = await verifyMenuItemOwnership(group.menu_item_id)
  return { ...result, menuItemId: group.menu_item_id }
}

// ── Optionsgruppen ────────────────────────────────────────────────────────────

export interface OptionGroupWithOptions extends OptionGroup {
  menu_options: MenuOption[]
}

export async function getOptionGroups(menuItemId: string): Promise<{ data: OptionGroupWithOptions[] | null; error: string | null }> {
  if (!menuItemId) return { data: null, error: 'Ungültige Item-ID.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('menu_option_groups')
    .select('*, menu_options(*)')
    .eq('menu_item_id', menuItemId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch option groups:', error)
    return { data: null, error: 'Fehler beim Laden der Optionsgruppen.' }
  }

  // Sort options within each group
  const sorted = (data ?? []).map(g => ({
    ...g,
    menu_options: (g.menu_options ?? []).sort((a: MenuOption, b: MenuOption) => a.sort_order - b.sort_order),
  }))

  return { data: sorted as OptionGroupWithOptions[], error: null }
}

export async function createOptionGroup(
  menuItemId: string,
  data: { name: string; is_required?: boolean; min_select?: number; max_select?: number }
): Promise<{ groupId: string | null; error: string | null }> {
  const { projectId, error: authError } = await verifyMenuItemOwnership(menuItemId)
  if (authError || !projectId) return { groupId: null, error: authError ?? 'Kein Zugriff.' }

  const admin = createAdminClient()

  // Nächste sort_order ermitteln
  const { data: existing } = await admin
    .from('menu_option_groups')
    .select('sort_order')
    .eq('menu_item_id', menuItemId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = ((existing?.[0]?.sort_order ?? -1) + 1)

  const { data: group, error } = await admin
    .from('menu_option_groups')
    .insert({
      menu_item_id: menuItemId,
      name: data.name.trim(),
      is_required: data.is_required ?? false,
      min_select: data.min_select ?? 0,
      max_select: data.max_select ?? 1,
      sort_order: nextOrder,
    })
    .select('id')
    .single()

  if (error || !group) {
    console.error('Failed to create option group:', error)
    return { groupId: null, error: 'Fehler beim Erstellen der Optionsgruppe.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { groupId: group.id, error: null }
}

export async function updateOptionGroup(
  groupId: string,
  data: { name?: string; is_required?: boolean; min_select?: number; max_select?: number }
): Promise<{ error: string | null }> {
  const { projectId, error: authError } = await verifyOptionGroupOwnership(groupId)
  if (authError || !projectId) return { error: authError ?? 'Kein Zugriff.' }

  const admin = createAdminClient()
  const updatePayload: Record<string, unknown> = {}
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.is_required !== undefined) updatePayload.is_required = data.is_required
  if (data.min_select !== undefined) updatePayload.min_select = data.min_select
  if (data.max_select !== undefined) updatePayload.max_select = data.max_select

  const { error } = await admin
    .from('menu_option_groups')
    .update(updatePayload)
    .eq('id', groupId)

  if (error) {
    console.error('Failed to update option group:', error)
    return { error: 'Fehler beim Aktualisieren der Optionsgruppe.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

export async function deleteOptionGroup(groupId: string): Promise<{ error: string | null }> {
  const { projectId, error: authError } = await verifyOptionGroupOwnership(groupId)
  if (authError || !projectId) return { error: authError ?? 'Kein Zugriff.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('menu_option_groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    console.error('Failed to delete option group:', error)
    return { error: 'Fehler beim Löschen der Optionsgruppe.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

export async function reorderOptionGroups(
  menuItemId: string,
  orderedIds: string[]
): Promise<{ error: string | null }> {
  const { projectId, error: authError } = await verifyMenuItemOwnership(menuItemId)
  if (authError || !projectId) return { error: authError ?? 'Kein Zugriff.' }

  const admin = createAdminClient()
  const updates = orderedIds.map((id, i) =>
    admin.from('menu_option_groups').update({ sort_order: i }).eq('id', id)
  )
  await Promise.all(updates)

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

// ── Einzelne Optionen ─────────────────────────────────────────────────────────

export async function createOption(
  groupId: string,
  data: { name: string; priceCents?: number; isDefault?: boolean }
): Promise<{ optionId: string | null; error: string | null }> {
  const { projectId, error: authError } = await verifyOptionGroupOwnership(groupId)
  if (authError || !projectId) return { optionId: null, error: authError ?? 'Kein Zugriff.' }

  const admin = createAdminClient()

  // Nächste sort_order
  const { data: existing } = await admin
    .from('menu_options')
    .select('sort_order')
    .eq('option_group_id', groupId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = ((existing?.[0]?.sort_order ?? -1) + 1)

  const { data: option, error } = await admin
    .from('menu_options')
    .insert({
      option_group_id: groupId,
      name: data.name.trim(),
      price_cents: Math.max(0, data.priceCents ?? 0),
      is_default: data.isDefault ?? false,
      sort_order: nextOrder,
    })
    .select('id')
    .single()

  if (error || !option) {
    console.error('Failed to create option:', error)
    return { optionId: null, error: 'Fehler beim Erstellen der Option.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { optionId: option.id, error: null }
}

export async function updateOption(
  optionId: string,
  data: { name?: string; priceCents?: number; isDefault?: boolean }
): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { data: option } = await admin
    .from('menu_options')
    .select('id, option_group_id')
    .eq('id', optionId)
    .single()
  if (!option) return { error: 'Option nicht gefunden.' }

  const { projectId, error: authError } = await verifyOptionGroupOwnership(option.option_group_id)
  if (authError || !projectId) return { error: authError ?? 'Kein Zugriff.' }

  const updatePayload: Record<string, unknown> = {}
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.priceCents !== undefined) updatePayload.price_cents = Math.max(0, data.priceCents)
  if (data.isDefault !== undefined) updatePayload.is_default = data.isDefault

  const { error } = await admin
    .from('menu_options')
    .update(updatePayload)
    .eq('id', optionId)

  if (error) {
    console.error('Failed to update option:', error)
    return { error: 'Fehler beim Aktualisieren der Option.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

export async function deleteOption(optionId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { data: option } = await admin
    .from('menu_options')
    .select('id, option_group_id')
    .eq('id', optionId)
    .single()
  if (!option) return { error: 'Option nicht gefunden.' }

  const { projectId, error: authError } = await verifyOptionGroupOwnership(option.option_group_id)
  if (authError || !projectId) return { error: authError ?? 'Kein Zugriff.' }

  const { error } = await admin
    .from('menu_options')
    .delete()
    .eq('id', optionId)

  if (error) {
    console.error('Failed to delete option:', error)
    return { error: 'Fehler beim Löschen der Option.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

export async function reorderOptions(
  groupId: string,
  orderedIds: string[]
): Promise<{ error: string | null }> {
  const { projectId, error: authError } = await verifyOptionGroupOwnership(groupId)
  if (authError || !projectId) return { error: authError ?? 'Kein Zugriff.' }

  const admin = createAdminClient()
  const updates = orderedIds.map((id, i) =>
    admin.from('menu_options').update({ sort_order: i }).eq('id', id)
  )
  await Promise.all(updates)

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { error: null }
}

// ── Kopieren ──────────────────────────────────────────────────────────────────

/**
 * Kopiert alle Optionsgruppen + Optionen von einem Gericht auf ein anderes.
 * Bestehende Gruppen am Ziel bleiben erhalten — neue werden hinzugefügt.
 */
export async function copyOptionGroupsToItem(
  sourceItemId: string,
  targetItemId: string
): Promise<{ error: string | null }> {
  // Ownership für Source und Target prüfen
  const { projectId: srcProject, error: srcErr } = await verifyMenuItemOwnership(sourceItemId)
  if (srcErr || !srcProject) return { error: srcErr ?? 'Kein Zugriff auf Quell-Gericht.' }

  const { projectId: tgtProject, error: tgtErr } = await verifyMenuItemOwnership(targetItemId)
  if (tgtErr || !tgtProject) return { error: tgtErr ?? 'Kein Zugriff auf Ziel-Gericht.' }

  const admin = createAdminClient()

  // Source-Gruppen laden
  const { data: sourceGroups } = await admin
    .from('menu_option_groups')
    .select('*, menu_options(*)')
    .eq('menu_item_id', sourceItemId)
    .order('sort_order', { ascending: true })

  if (!sourceGroups?.length) return { error: 'Quell-Gericht hat keine Optionsgruppen.' }

  // Nächste sort_order am Ziel
  const { data: existingTarget } = await admin
    .from('menu_option_groups')
    .select('sort_order')
    .eq('menu_item_id', targetItemId)
    .order('sort_order', { ascending: false })
    .limit(1)
  let nextOrder = ((existingTarget?.[0]?.sort_order ?? -1) + 1)

  // Gruppen + Optionen kopieren
  for (const group of sourceGroups) {
    const { data: newGroup } = await admin
      .from('menu_option_groups')
      .insert({
        menu_item_id: targetItemId,
        name: group.name,
        is_required: group.is_required,
        min_select: group.min_select,
        max_select: group.max_select,
        sort_order: nextOrder++,
      })
      .select('id')
      .single()

    if (newGroup && group.menu_options?.length) {
      const optionInserts = group.menu_options.map((opt: MenuOption, i: number) => ({
        option_group_id: newGroup.id,
        name: opt.name,
        price_cents: opt.price_cents,
        is_default: opt.is_default,
        sort_order: i,
      }))
      await admin.from('menu_options').insert(optionInserts)
    }
  }

  revalidatePath(`/dashboard/project/${tgtProject}/menu`)
  return { error: null }
}

/**
 * Lädt alle Gerichte eines Projekts (für CopyOptionsModal Dropdown).
 */
export async function getMenuItemsForProject(projectId: string): Promise<{
  data: { id: string; name: string; categoryName: string; hasOptions: boolean }[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return { data: null, error: 'Kein Zugriff.' }

  const admin = createAdminClient()
  const { data: categories } = await admin
    .from('menu_categories')
    .select('id, name, menu_items(id, name)')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (!categories) return { data: [], error: null }

  // Prüfe welche Items Optionsgruppen haben
  const allItemIds = categories.flatMap(c => (c.menu_items ?? []).map((i: { id: string }) => i.id))
  const { data: groupCounts } = await admin
    .from('menu_option_groups')
    .select('menu_item_id')
    .in('menu_item_id', allItemIds)

  const itemsWithOptions = new Set((groupCounts ?? []).map(g => g.menu_item_id))

  const items = categories.flatMap(c =>
    (c.menu_items ?? []).map((item: { id: string; name: string }) => ({
      id: item.id,
      name: item.name,
      categoryName: c.name,
      hasOptions: itemsWithOptions.has(item.id),
    }))
  )

  return { data: items, error: null }
}

// ── Gesamte Speisekarte löschen ───────────────────────────────────────────────

export async function deleteEntireMenu(projectId: string): Promise<{ deletedCategories: number; error: string | null }> {
  if (!projectId) return { deletedCategories: 0, error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { deletedCategories: 0, error: 'Not authenticated.' }

  // Ownership check
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { deletedCategories: 0, error: 'Kein Zugriff auf dieses Projekt.' }

  // Count categories before deletion
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('project_id', projectId)

  const count = categories?.length ?? 0

  if (count === 0) return { deletedCategories: 0, error: 'Keine Kategorien vorhanden.' }

  // Delete all categories (items + option_groups + options cascade via DB)
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('project_id', projectId)

  if (error) {
    console.error('Failed to delete entire menu:', error)
    return { deletedCategories: 0, error: 'Fehler beim Löschen der Speisekarte.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/menu`)
  return { deletedCategories: count, error: null }
}
