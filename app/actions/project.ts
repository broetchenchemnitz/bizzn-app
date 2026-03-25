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
