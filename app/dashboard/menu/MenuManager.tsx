'use client'


import Link from 'next/link'
import { addDish, deleteDish } from './actions'
import type { Category, Dish } from './page'

interface Props {
  restaurantName: string
  categories: Category[]
  dishes: Dish[]
}


// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MenuManager({ restaurantName: _restaurantName, categories, dishes }: Props) {

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 selection:bg-[#C7A17A]/30 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">Speisekarten-Management</h1>
          <p className="text-zinc-400">Verwalte deine Gerichte, Preise und Kategorien.</p>
        </header>

        {/* CRUD Formular */}
        <form action={async (fd) => { await addDish(fd) }} className="bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md p-6 md:p-8 rounded-3xl mb-12 flex flex-col gap-5 shadow-2xl shadow-black/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input type="text" name="name" placeholder="Name des Gerichts" className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-zinc-100 focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-all placeholder:text-zinc-600 shadow-inner w-full" required />
            <div className="flex gap-4 w-full">
              <input type="number" name="price" step="0.01" placeholder="Preis (€)" className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-zinc-100 w-1/2 focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-all placeholder:text-zinc-600 shadow-inner font-mono" required />
              <select name="categoryId" className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-zinc-100 w-1/2 focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-all appearance-none shadow-inner cursor-pointer" required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <textarea name="description" placeholder="Schmackhafte Beschreibung (optional)" className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-zinc-100 focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-all placeholder:text-zinc-600 min-h-[100px] resize-y shadow-inner"></textarea>

          <button type="submit" className="bg-[#C7A17A] text-black text-sm uppercase tracking-wide font-bold py-4 px-6 rounded-xl hover:bg-[#88e600] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(119,204,0,0.2)] hover:shadow-[0_0_30px_rgba(119,204,0,0.4)] mt-2 w-full md:w-auto md:self-end">
            Gericht hinzufügen
          </button>
        </form>

        {/* Gericht-Übersicht gruppiert nach Kategorie */}
        <div className="space-y-12">
          {categories.map(category => (
            <div key={category.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-[#C7A17A] shadow-[0_0_8px_rgba(119,204,0,0.8)]"></div>
                <Link
                  href={`/dashboard/menu/${category.id}`}
                  className="text-2xl font-bold text-white tracking-tight hover:text-[#C7A17A] transition-colors"
                >
                  {category.name} →
                </Link>
              </div>

              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {dishes.filter(d => d.category_id === category.id).map(dish => (
                  <li key={dish.id} className="group bg-zinc-900/40 border border-zinc-800/50 hover:border-[#C7A17A]/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-800/60 transition-all duration-300 relative overflow-hidden">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-[#C7A17A] transition-colors">{dish.name}</h3>
                      <p className="text-sm text-zinc-400 mt-1 leading-relaxed line-clamp-2">{dish.description}</p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end mt-3 md:mt-0">
                      <span className="font-mono text-lg font-medium text-[#C7A17A] bg-[#C7A17A]/10 px-3 py-1 rounded-lg border border-[#C7A17A]/20 whitespace-nowrap">
                        {dish.price.toFixed(2)} €
                      </span>
                      <form action={deleteDish.bind(null, dish.id)}>
                        <button
                          type="submit"
                          className="px-3 py-1 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                          Löschen
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
