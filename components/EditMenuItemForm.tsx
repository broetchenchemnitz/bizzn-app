'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Loader2, Trash2, ImagePlus, ImageOff } from 'lucide-react'
import { updateMenuItem, deleteMenuItem } from '@/app/actions/menu'
import type { Database } from '@/types/supabase'

type MenuItem = Database['public']['Tables']['menu_items']['Row']

interface EditMenuItemFormProps {
  item: MenuItem
  onClose: () => void
}

export default function EditMenuItemForm({ item, onClose }: EditMenuItemFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isUploadingImg, setIsUploadingImg] = useState(false)
  const [isDeletingImg, setIsDeletingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description ?? '')
  const [priceEuro, setPriceEuro] = useState((item.price / 100).toFixed(2))
  const [isActive, setIsActive] = useState(item.is_active)
  const [imageUrl, setImageUrl] = useState<string | null>(item.image_url ?? null)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    const priceCents = Math.round(parseFloat(priceEuro.replace(',', '.')) * 100)
    if (!name.trim()) { setError('Name darf nicht leer sein.'); return }
    if (isNaN(priceCents) || priceCents < 0) { setError('Ungültiger Preis.'); return }

    setError(null)
    startTransition(async () => {
      const result = await updateMenuItem(item.id, {
        name: name.trim(),
        description: description.trim(),
        price: priceCents,
        is_active: isActive,
      })
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`„${item.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return
    startDeleteTransition(async () => {
      const result = await deleteMenuItem(item.id)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIsUploadingImg(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('itemId', item.id)

    try {
      const res = await fetch('/api/menu-images', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Upload fehlgeschlagen.')
      } else {
        setImageUrl(data.url)
        router.refresh()
      }
    } catch {
      setError('Netzwerkfehler beim Upload.')
    } finally {
      setIsUploadingImg(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImageDelete = async () => {
    if (!confirm('Bild löschen?')) return
    setError(null)
    setIsDeletingImg(true)

    try {
      const res = await fetch('/api/menu-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Löschen fehlgeschlagen.')
      } else {
        setImageUrl(null)
        router.refresh()
      }
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setIsDeletingImg(false)
    }
  }

  const isAnyLoading = isPending || isDeleting || isUploadingImg || isDeletingImg

  return (
    <div className="mt-3 bg-[#1a1a1a] border border-[#C7A17A]/30 rounded-2xl p-4 space-y-3 shadow-[0_0_20px_rgba(199,161,122,0.08)] animate-in slide-in-from-top-2 duration-200">

      {/* Bild-Upload */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Bild</label>
        {imageUrl ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-700 group/img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
            {/* Overlay-Aktionen */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                id={`edit-item-img-replace-${item.id}`}
                type="button"
                disabled={isAnyLoading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-all"
              >
                {isUploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                Ersetzen
              </button>
              <button
                id={`edit-item-img-delete-${item.id}`}
                type="button"
                disabled={isAnyLoading}
                onClick={handleImageDelete}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-300 bg-red-900/30 hover:bg-red-900/50 px-3 py-1.5 rounded-lg transition-all"
              >
                {isDeletingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageOff className="w-3.5 h-3.5" />}
                Löschen
              </button>
            </div>
          </div>
        ) : (
          <button
            id={`edit-item-img-upload-${item.id}`}
            type="button"
            disabled={isAnyLoading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-700 hover:border-[#C7A17A]/40 hover:bg-[#C7A17A]/5 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#C7A17A] group/upload disabled:opacity-50"
          >
            {isUploadingImg
              ? <Loader2 className="w-7 h-7 animate-spin text-[#C7A17A]" />
              : <ImagePlus className="w-7 h-7 group-hover/upload:scale-110 transition-transform" />
            }
            <span className="text-xs font-medium">
              {isUploadingImg ? 'Wird hochgeladen…' : 'Bild hochladen (JPG, PNG, WebP · max. 3 MB)'}
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          id={`edit-item-file-${item.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
        <input
          id={`edit-item-name-${item.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 focus:ring-1 focus:ring-[#C7A17A]/30 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-all"
          placeholder="z.B. Margherita"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Beschreibung</label>
        <textarea
          id={`edit-item-desc-${item.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 focus:ring-1 focus:ring-[#C7A17A]/30 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-all resize-none"
          placeholder="Kurze Beschreibung (optional)"
        />
      </div>

      {/* Price + Active Toggle */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400 mb-1">Preis (€)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
            <input
              id={`edit-item-price-${item.id}`}
              type="text"
              inputMode="decimal"
              value={priceEuro}
              onChange={(e) => setPriceEuro(e.target.value)}
              className="w-full bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 focus:ring-1 focus:ring-[#C7A17A]/30 rounded-xl pl-7 pr-3 py-2 text-sm text-[#C7A17A] font-semibold tabular-nums outline-none transition-all"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <button
            id={`edit-item-toggle-${item.id}`}
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${isActive ? 'bg-[#C7A17A]' : 'bg-gray-700'}`}
            aria-label={isActive ? 'Aktiv — zum Deaktivieren klicken' : 'Inaktiv — zum Aktivieren klicken'}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="text-xs text-gray-400">{isActive ? 'Aktiv' : 'Inaktiv'}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          id={`edit-item-delete-${item.id}`}
          type="button"
          onClick={handleDelete}
          disabled={isAnyLoading}
          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
        >
          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Löschen
        </button>

        <div className="flex items-center gap-2">
          <button
            id={`edit-item-cancel-${item.id}`}
            type="button"
            onClick={onClose}
            disabled={isAnyLoading}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5" /> Abbrechen
          </button>
          <button
            id={`edit-item-save-${item.id}`}
            type="button"
            onClick={handleSave}
            disabled={isAnyLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a1a1a] bg-[#C7A17A] hover:bg-[#B58E62] px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 shadow-[0_0_10px_rgba(199,161,122,0.25)]"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
