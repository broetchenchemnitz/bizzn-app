import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { deleteDish } from '@/app/lib/actions/dishActions'
import DishForm from './DishForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: { categoryId: string }
}

export async function generateMetadata({ params }: Props) {
  return { title: `Kategorie | Bizzn Dashboard` }
}

export default async function CategoryDetailPage({ params }: Props) {
  const { categoryId } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch the category (RLS ensures we only see our own)
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, restaurant_id')
    .eq('id', categoryId)
    .single()

  if (!category) notFound()

  // Fetch all dishes for this category
  const { data: dishes } = await supabase
    .from('menu_items')
    .select('id, name, description, price, is_available')
    .eq('category_id', categoryId)
    .order('name', { ascending: true })

  const safeDishes = dishes ?? []

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="mb-10">
          <Link
            href="/dashboard/menu"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[#77CC00] transition-colors mb-6 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Zurück zur Speisekarte
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            {category.name}
          </h1>
          <p className="text-zinc-400">
            {safeDishes.length} {safeDishes.length === 1 ? 'Gericht' : 'Gerichte'} in dieser Kategorie
          </p>
        </header>

        {/* Add Dish Form */}
        <section className="bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md p-6 md:p-8 rounded-3xl mb-10 shadow-2xl shadow-black/40">
          <h2 className="text-lg font-bold text-white mb-5">Neues Gericht hinzufügen</h2>
          <DishForm categoryId={categoryId} />
        </section>

        {/* Dish List */}
        <section>
          <h2 className="text-lg font-bold text-zinc-200 border-b border-zinc-800 pb-3 mb-6">
            Aktuelle Gerichte
          </h2>

          {safeDishes.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-2xl">
              <p className="text-zinc-500">Noch keine Gerichte in dieser Kategorie.</p>
              <p className="text-zinc-600 text-sm mt-2">Füge dein erstes Gericht oben hinzu.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeDishes.map((dish) => (
                <li
                  key={dish.id}
                  className="group bg-zinc-900/40 border border-zinc-800/50 hover:border-[#77CC00]/30 p-5 rounded-2xl flex flex-col gap-3 hover:bg-zinc-800/50 transition-all duration-300"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-[#77CC00] transition-colors truncate">
                        {dish.name}
                      </h3>
                      {dish.description && (
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {dish.description}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-lg font-medium text-[#77CC00] bg-[#77CC00]/10 px-3 py-1 rounded-lg border border-[#77CC00]/20 whitespace-nowrap shrink-0">
                      {Number(dish.price).toFixed(2)} €
                    </span>
                  </div>

                  {/* Delete form — RSC-safe server action */}
                  <form action={deleteDish.bind(null, dish.id)} className="flex justify-end">
                    <button
                      type="submit"
                      className="text-xs font-semibold uppercase tracking-wider text-red-500/70 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-red-500/20"
                    >
                      Löschen
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}
