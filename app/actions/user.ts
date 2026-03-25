'use server'

import { createClient } from '@/lib/supabase-server'

export async function updateUserName(newName: string) {
  if (!newName || newName.trim() === '') {
    return { error: 'Name darf nicht leer sein.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { error } = await supabase.auth.updateUser({
    data: { full_name: newName.trim() },
  })

  if (error) {
    console.error('Failed to update user name:', error)
    return { error: 'Fehler beim Aktualisieren des Namens.' }
  }

  return { success: true }
}
