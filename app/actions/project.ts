'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateProjectName(projectId: string, newName: string) {
  if (!projectId || !newName || newName.trim() === '') {
    return { error: 'Invalid project ID or name.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ name: newName.trim() })
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
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
