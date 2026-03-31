'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { addDish, updateDish, deleteDish } from './actions'
import type { Category, Dish } from './page'

interface Props {
  restaurantName: string
  categories: Category[]
  dishes: Dish[]
}

// ─── ADD FORM ─────────────────────────────────────────────────────────────────
function AddDishForm({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await addDish({}, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8 space-y-4"
    >
      <h2 className="text-lg font-bold text-white mb-2">Neues Gericht hinzufügen</h2>

      {categories.length === 0 && (
        <p className="text-yellow-400 text-sm bg-yellow-900/30 border border-yellow-700 rounded-lg px-4 py-3">
          ⚠️ Keine Kategorien vorhanden. Bitte zuerst eine Kategorie anlegen.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="z.B. Margherita"
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Kategorie <span className="text-red-400">*</span>
          </label>
          <select
            name="category_id"
            required
            disabled={categories.length === 0}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all disabled:opacity-50"
          >
            <option value="">Kategorie wählen…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Preis (€) <span className="text-red-400">*</span>
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Beschreibung
          </label>
          <input
            name="description"
            type="text"
            placeholder="Optional"
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#77CC00] focus:ring-1 focus:ring-[#77CC00] transition-all"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800/60 px-4 py-2.5 rounded-xl">
          ⚠️ {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-[#77CC00] bg-green-950/30 border border-green-800/40 px-4 py-2.5 rounded-xl">
          ✓ Gericht erfolgreich hinzugefügt.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || categories.length === 0}
        className="bg-[#77CC00] text-black font-bold px-6 py-2.5 rounded-xl hover:bg-[#66b300] transition-colors disabled:opacity-50 active:scale-95"
      >
        {pending ? 'Speichert…' : '+ Gericht hinzufügen'}
      </button>
    </form>
  )
}

// ─── DISH ROW ─────────────────────────────────────────────────────────────────
function DishRow({
  dish,
  categories,
}: {
  dish: Dish
  categories: Category[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm(`"${dish.name}" wirklich löschen?`)) return
    startTransition(async () => {
      const result = await deleteDish(dish.id)
      if (result?.error) setError(result.error)
    })
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await updateDish(dish.id, {}, formData)
      if (result.error) setError(result.error)
      else setEditing(false)
    })
  }

  if (editing) {
    return (
      <li className="bg-gray-900 border border-[#77CC00]/40 rounded-xl p-4">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              name="name"
              defaultValue={dish.name}
              required
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#77CC00]"
            />
            <select
              name="category_id"
              defaultValue={dish.category_id}
              required
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#77CC00]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={dish.price}
              required
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#77CC00]"
            />
            <input
              name="description"
              defaultValue={dish.description ?? ''}
              placeholder="Beschreibung"
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#77CC00]"
            />
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-[#77CC00] text-black font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-[#66b300] transition-colors disabled:opacity-50"
            >
              {pending ? 'Speichert…' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="group flex items-center justify-between bg-gray-900/60 border border-gray-700/60 hover:border-[#77CC00]/30 rounded-xl px-4 py-3 transition-all">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{dish.name}</p>
        {dish.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{dish.description}</p>
        )}
      </div>
      <span className="text-[#77CC00] font-bold text-sm ml-4 shrink-0">
        {Number(dish.price).toFixed(2)} €
      </span>
      {error && <p className="text-rose-400 text-xs ml-2">{error}</p>}
      <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1 text-xs font-semibold border border-gray-600 text-gray-300 hover:border-[#77CC00] hover:text-[#77CC00] rounded-lg transition-colors"
        >
          Bearbeiten
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="px-3 py-1 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors disabled:opacity-50"
        >
          Löschen
        </button>
      </div>
    </li>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function MenuManager({ restaurantName, categories, dishes }: Props) {
  // Group dishes by category
  const dishesByCategory = categories.map((cat) => ({
    ...cat,
    items: dishes.filter((d) => d.category_id === cat.id),
  }))

  const uncategorized = dishes.filter(
    (d) => !categories.find((c) => c.id === d.category_id)
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-1">
            Speisekarten-Management
          </h1>
          <p className="text-gray-400">{restaurantName}</p>
        </header>

        {/* Add Dish Form */}
        <AddDishForm categories={categories} />

        {/* Dish List grouped by Category */}
        <section className="space-y-8">
          <h2 className="text-lg font-bold text-gray-200 border-b border-gray-700 pb-3">
            Aktuelle Gerichte
            <span className="ml-3 text-sm font-normal text-gray-500">
              {dishes.length} gesamt
            </span>
          </h2>

          {categories.length === 0 && dishes.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-2xl">
              <p className="text-gray-500">Noch keine Kategorien oder Gerichte vorhanden.</p>
            </div>
          ) : (
            <>
              {dishesByCategory.map((cat) => (
                <div key={cat.id}>
                  <h3 className="text-sm font-bold text-[#77CC00] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#77CC00] inline-block" />
                    {cat.name}
                    <span className="text-gray-500 font-normal normal-case tracking-normal">
                      ({cat.items.length})
                    </span>
                  </h3>
                  {cat.items.length === 0 ? (
                    <p className="text-gray-600 text-sm ml-4">Noch keine Gerichte in dieser Kategorie.</p>
                  ) : (
                    <ul className="space-y-2">
                      {cat.items.map((dish) => (
                        <DishRow key={dish.id} dish={dish} categories={categories} />
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {uncategorized.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Ohne Kategorie ({uncategorized.length})
                  </h3>
                  <ul className="space-y-2">
                    {uncategorized.map((dish) => (
                      <DishRow key={dish.id} dish={dish} categories={categories} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

      </div>
    </div>
  )
}
