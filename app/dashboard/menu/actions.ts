'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionResult = { success?: boolean; error?: string }

// ─── ADD DISH ────────────────────────────────────────────────────────────────
export async function addDish(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)
  const category_id = formData.get('category_id') as string

  if (!name || isNaN(price) || price < 0 || !category_id) {
    return { error: 'Bitte alle Pflichtfelder korrekt ausfüllen.' }
  }

  const { error } = await supabase.from('menu_items').insert({
    name,
    description,
    price,
    category_id,
    is_available: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/menu')
  return { success: true }
}

// ─── UPDATE DISH ─────────────────────────────────────────────────────────────
export async function updateDish(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)
  const category_id = formData.get('category_id') as string

  if (!name || isNaN(price) || price < 0 || !category_id) {
    return { error: 'Bitte alle Pflichtfelder korrekt ausfüllen.' }
  }

  // RLS enforced: Supabase only updates rows the authenticated owner can access
  const { error } = await supabase
    .from('menu_items')
    .update({ name, description, price, category_id })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/menu')
  return { success: true }
}

// ─── DELETE DISH ─────────────────────────────────────────────────────────────
export async function deleteDish(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  // RLS enforced: only the owner's rows are reachable
  const { error } = await supabase.from('menu_items').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/menu')
  return { success: true }
}
