'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
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

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete project:', error)
    return { error: 'Fehler beim Löschen des Projekts.' }
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht authentifiziert.' }

  const update: ProjectUpdate = { slug }

  const { error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    // Unique constraint violation
    if (error.code === '23505') {
      return { error: 'Diese Web-Adresse ist bereits vergeben. Bitte wähle eine andere.' }
    }
    console.error('Failed to update project slug:', error)
    return { error: 'Fehler beim Speichern der Web-Adresse.' }
  }

  revalidatePath(`/dashboard/project/${projectId}`)
  revalidatePath('/dashboard')
  return { success: true, slug }
}
