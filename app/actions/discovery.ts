'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateDiscoverySettings(
  projectId: string,
  isPublic: boolean,
  city: string,
  postalCode: string,
  cuisineType: string
): Promise<{ error: string | null }> {
  if (!projectId) return { error: 'Ungültige Projekt-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht authentifiziert.' }

  // Ownership check
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Projekt nicht gefunden oder kein Zugriff.' }

  const { error } = await supabase
    .from('projects')
    .update({
      is_public: isPublic,
      city: city.trim() || null,
      postal_code: postalCode.trim() || null,
      cuisine_type: cuisineType.trim() || null,
    })
    .eq('id', projectId)

  if (error) {
    console.error('Failed to update discovery settings:', error)
    return { error: 'Fehler beim Speichern der Discovery-Einstellungen.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/settings`)
  return { error: null }
}
