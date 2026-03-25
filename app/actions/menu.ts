'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/supabase'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']

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

export async function createMenuCategory(projectId: string, name: string): Promise<{ error: string | null }> {
  if (!projectId || !name.trim()) return { error: 'Ungültige Eingabe.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  // Verify project ownership
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
