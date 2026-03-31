import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import MenuManager from './MenuManager'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Speisekarte | Bizzn Dashboard',
}

export type Category = { id: string; name: string }
export type Dish = {
  id: string
  name: string
  description: string | null
  price: number
  is_available: boolean
  category_id: string
}

export default async function MenuPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Fetch the owner's restaurant (RLS guarantees owner_id = auth.uid())
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-xl text-gray-300 font-semibold">Kein Restaurant gefunden.</p>
        <p className="text-gray-500 text-sm">Bitte zuerst ein Restaurant anlegen.</p>
      </div>
    )
  }

  // Fetch categories for this restaurant
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true })

  const safeCategories: Category[] = categories ?? []

  // Fetch dishes belonging to this restaurant's categories
  const { data: dishes } = await supabase
    .from('menu_items')
    .select('id, name, description, price, is_available, category_id')
    .in(
      'category_id',
      safeCategories.map((c) => c.id)
    )
    .order('name', { ascending: true })

  const safeDishes: Dish[] = dishes ?? []

  return (
    <MenuManager
      restaurantName={restaurant.name}
      categories={safeCategories}
      dishes={safeDishes}
    />
  )
}
