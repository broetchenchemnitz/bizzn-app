'use client'

import Link from 'next/link'
import { addDish, deleteDish } from './actions'
import type { Category, Dish } from './page'

interface Props {
  restaurantName: string
  categories: Category[]
  dishes: Dish[]
}

export default function MenuManager({ restaurantName, categories, dishes }: Props) {
  return (
    <div className="min-h-full bg-[#1A1A1A] text-white font-sans selection:bg-[#C7A17A] selection:text-[#1A1A1A]">
      <div className="max-w-5xl mx-auto space-y-8">

        <header>
          <h1 className="text-3xl font-extrabold text-[#C7A17A]">
            Speisekarten-Management
          </h1>
          <p className="text-gray-400 mt-2">
            Verwalte deine Gerichte, Preise und Kategorien für{' '}
            <span className="text-white font-medium">{restaurantName}</span>.
          </p>
        </header>

        {/* ── CRUD Formular ───────────────────────────────────────────────── */}
        <form
          action={async (fd) => { await addDish(fd) }}
          className="bg-[#242424] border border-[#333333] rounded-xl p-6 shadow-lg space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              required
              id="dish-name"
              name="name"
              placeholder="Name des Gerichts"
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-colors"
            />
            <input
              required
              id="dish-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Preis (z.B. 12.50)"
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-colors font-mono"
            />
            <select
              required
              id="dish-category"
              name="categoryId"
              defaultValue=""
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md p-3 text-white focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled>Kategorie wählen</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <textarea
            id="dish-description"
            name="description"
            placeholder="Optionale Beschreibung"
            rows={2}
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-colors resize-y"
          />

          <button
            id="btn-add-dish"
            type="submit"
            className="w-full md:w-auto bg-[#C7A17A] hover:bg-[#B58E62] text-[#1A1A1A] font-semibold py-2.5 px-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#242424] focus:ring-[#C7A17A]"
          >
            Gericht hinzufügen
          </button>
        </form>

        {/* ── Kategorien-Gruppen ───────────────────────────────────────────── */}
        {categories.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-[#333333] rounded-xl">
            <p className="text-gray-500 text-sm">
              Noch keine Kategorien vorhanden. Lege zuerst eine Kategorie an.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryDishes = dishes.filter(d => d.category_id === category.id)

              return (
                <div
                  key={category.id}
                  className="bg-[#242424] border border-[#333333] rounded-xl overflow-hidden shadow-lg"
                >
                  {/* Category Header */}
                  <div className="bg-[#1A1A1A] px-6 py-4 border-b border-[#333333] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#C7A17A] shadow-[0_0_8px_rgba(199,161,122,0.6)] flex-shrink-0" />
                    <Link
                      href={`/dashboard/menu/${category.id}`}
                      className="text-lg font-bold text-white hover:text-[#C7A17A] transition-colors"
                    >
                      {category.name}
                    </Link>
                    <span className="ml-auto text-xs text-gray-500 bg-[#242424] px-2 py-0.5 rounded-full border border-[#333333]">
                      {categoryDishes.length} {categoryDishes.length === 1 ? 'Gericht' : 'Gerichte'}
                    </span>
                  </div>

                  {/* Dishes List */}
                  {categoryDishes.length === 0 ? (
                    <p className="px-6 py-4 text-sm text-gray-600 italic">
                      Noch keine Gerichte in dieser Kategorie.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#333333]">
                      {categoryDishes.map(dish => (
                        <li
                          key={dish.id}
                          className="px-6 py-4 hover:bg-[#1A1A1A]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{dish.name}</h3>
                            {dish.description && (
                              <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
                                {dish.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[#C7A17A] font-bold font-mono bg-[#1A1A1A] border border-[#333333] px-3 py-1.5 rounded-md text-sm">
                              {dish.price.toFixed(2)} €
                            </span>
                            <form action={deleteDish.bind(null, dish.id)}>
                              <button
                                type="submit"
                                className="text-red-400 bg-red-950/30 hover:bg-red-900/50 hover:text-red-300 px-3 py-1.5 rounded-md transition-colors text-sm font-medium border border-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                              >
                                Löschen
                              </button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
