'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── CREATE DISH ──────────────────────────────────────────────────────────────
export async function createDish(
  categoryId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet.')

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)

  if (!name || isNaN(price) || price < 0 || !categoryId) {
    throw new Error('Bitte alle Pflichtfelder korrekt ausfüllen.')
  }

  const { error } = await supabase.from('menu_items').insert({
    name,
    description,
    price,
    category_id: categoryId, // Maps categoryId param → category_id DB column
    is_available: true,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/menu/${categoryId}`)
  revalidatePath('/dashboard/menu')
}

// ─── UPDATE DISH ──────────────────────────────────────────────────────────────
export async function updateDish(
  dishId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet.')

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)

  if (!name || isNaN(price) || price < 0) {
    throw new Error('Bitte alle Pflichtfelder korrekt ausfüllen.')
  }

  // First fetch the dish to know its category for revalidation
  const { data: dish } = await supabase
    .from('menu_items')
    .select('category_id')
    .eq('id', dishId)
    .single()

  const { error } = await supabase
    .from('menu_items')
    .update({ name, description, price })
    .eq('id', dishId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/menu/${dish?.category_id ?? ''}`)
  revalidatePath('/dashboard/menu')
}

// ─── DELETE DISH ──────────────────────────────────────────────────────────────
export async function deleteDish(dishId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet.')

  // Fetch category_id for targeted revalidation before deletion
  const { data: dish } = await supabase
    .from('menu_items')
    .select('category_id')
    .eq('id', dishId)
    .single()

  const { error } = await supabase.from('menu_items').delete().eq('id', dishId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/menu/${dish?.category_id ?? ''}`)
  revalidatePath('/dashboard/menu')
}
