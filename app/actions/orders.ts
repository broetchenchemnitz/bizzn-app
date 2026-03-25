'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/supabase'

type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

export async function updateOrderStatus(
  orderId: string,
  projectId: string,
  newStatus: OrderStatus
): Promise<{ error: string | null }> {
  if (!orderId || !projectId) return { error: 'Ungültige Parameter.' }

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

  if (!project) return { error: 'Kein Zugriff auf dieses Projekt.' }

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .eq('project_id', projectId)

  if (error) {
    console.error('Failed to update order status:', error)
    return { error: 'Fehler beim Aktualisieren des Status.' }
  }

  revalidatePath(`/dashboard/project/${projectId}/orders`)
  revalidatePath(`/dashboard/project/${projectId}`)
  return { error: null }
}
