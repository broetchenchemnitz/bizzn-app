'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, X, Loader2, GripVertical } from 'lucide-react'
import { updateMenuCategory, deleteMenuCategory } from '@/app/actions/menu'
import type { Database } from '@/types/supabase'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']

interface EditCategoryInlineProps {
  category: MenuCategory
  projectId: string
  itemCount?: number
}

export default function EditCategoryInline({ category, projectId, itemCount }: EditCategoryInlineProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleSave = () => {
    if (!name.trim()) { setError('Name darf nicht leer sein.'); return }
    setError(null)
    startSaveTransition(async () => {
      const result = await updateMenuCategory(category.id, name.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setIsEditing(false)
        router.refresh()
      }
    })
  }

  const handleCancelEdit = () => {
    setName(category.name)
    setIsEditing(false)
    setError(null)
  }

  const handleDelete = () => {
    if (!confirm(`Kategorie „${category.name}" und alle enthaltenen Speisen löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return
    startDeleteTransition(async () => {
      const result = await deleteMenuCategory(category.id, projectId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancelEdit()
  }

  if (isEditing) {
    return (
      <li className="group">
        <div className="flex items-center gap-2 bg-[#1a1a1a] p-3 rounded-2xl border border-[#C7A17A]/40 shadow-[0_0_15px_rgba(199,161,122,0.1)]">
          <GripVertical className="w-4 h-4 text-gray-700 shrink-0" />
          <input
            ref={inputRef}
            id={`edit-category-input-${category.id}`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-[#242424] border border-[#C7A17A]/40 focus:border-[#C7A17A]/80 focus:ring-1 focus:ring-[#C7A17A]/20 rounded-xl px-3 py-1.5 text-sm text-white outline-none transition-all"
            placeholder="Kategoriename"
            aria-label={`Kategoriename bearbeiten: ${category.name}`}
          />
          <button
            id={`edit-category-save-${category.id}`}
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-1.5 text-[#C7A17A] hover:bg-[#C7A17A]/15 rounded-lg transition-all disabled:opacity-40"
            aria-label="Kategorie speichern"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            id={`edit-category-cancel-${category.id}`}
            type="button"
            onClick={handleCancelEdit}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-all"
            aria-label="Bearbeitung abbrechen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-400 mt-1 px-3">{error}</p>
        )}
      </li>
    )
  }

  return (
    <li className="group">
      <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-2xl border border-gray-800 hover:border-[#C7A17A]/30 hover:bg-[#C7A17A]/5 transition-all duration-200">
        {/* Drag handle (visual only) */}
        <span className="pl-3 py-4 text-gray-700">
          <GripVertical className="w-4 h-4" />
        </span>

        {/* Main content — links to category */}
        <a
          href={`/dashboard/project/${projectId}/menu/${category.id}`}
          className="flex-1 flex items-center justify-between py-4 pr-2 min-w-0"
        >
          <span className="font-medium text-gray-200 group-hover:text-[#C7A17A] transition-colors truncate">
            {category.name}
          </span>
          {itemCount !== undefined && (
            <span className="text-xs text-gray-500 tabular-nums shrink-0 ml-2">
              {itemCount} {itemCount === 1 ? 'Speise' : 'Speisen'}
            </span>
          )}
        </a>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            id={`edit-category-btn-${category.id}`}
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-500 hover:text-[#C7A17A] hover:bg-[#C7A17A]/10 rounded-lg transition-all"
            aria-label={`Kategorie ${category.name} umbenennen`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            id={`delete-category-btn-${category.id}`}
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-40"
            aria-label={`Kategorie ${category.name} löschen`}
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400 mt-1 px-3">{error}</p>
      )}
    </li>
  )
}
