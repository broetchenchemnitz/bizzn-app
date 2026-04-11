'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/supabase'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

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
