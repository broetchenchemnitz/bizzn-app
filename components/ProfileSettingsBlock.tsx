"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Store } from 'lucide-react'
import { updateProjectProfile } from '@/app/actions/project'

const CUISINE_OPTIONS = [
  'Japanisch / Sushi',
  'Italianisch / Pizza',
  'Burger & Grill',
  'Indisch',
  'Chinesisch',
  'Türkisch / Döner',
  'Griechisch',
  'Vietnamesisch',
  'Mexikanisch',
  'Veggie / Vegan',
  'Bakery / Café',
  'Seafood',
  'Sonstige',
]

const DAY_KEYS = [
  { key: 'mo', label: 'Montag' },
  { key: 'di', label: 'Dienstag' },
  { key: 'mi', label: 'Mittwoch' },
  { key: 'do', label: 'Donnerstag' },
  { key: 'fr', label: 'Freitag' },
  { key: 'sa', label: 'Samstag' },
  { key: 'so', label: 'Sonntag' },
]

type Props = {
  projectId: string
  initialData: {
    description?: string | null
    address?: string | null
    phone?: string | null
    cuisine_type?: string | null
    cover_image_url?: string | null
    opening_hours?: Record<string, string> | null
  }
}

export default function ProfileSettingsBlock({ projectId, initialData }: Props) {
  const router = useRouter()

  const [description, setDescription] = useState(initialData.description ?? '')
  const [address, setAddress] = useState(initialData.address ?? '')
  const [phone, setPhone] = useState(initialData.phone ?? '')
  const [cuisineType, setCuisineType] = useState(initialData.cuisine_type ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(initialData.cover_image_url ?? '')
  const [hours, setHours] = useState<Record<string, string>>(
    (initialData.opening_hours as Record<string, string>) ?? {}
  )

  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setHourForDay = (key: string, value: string) => {
    setHours((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)

    const result = await updateProjectProfile(projectId, {
      description,
      address,
      phone,
      cuisine_type: cuisineType,
      cover_image_url: coverImageUrl,
      opening_hours: hours,
    })

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 bg-red-950 text-red-400 rounded-lg text-xs border border-red-900">
          {error}
        </div>
      )}

      {/* Beschreibung */}
      <div>
        <label htmlFor="profile-description" className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Kurzbeschreibung
        </label>
        <textarea
          id="profile-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Frisches Sushi aus regionalen Zutaten — mitten in Chemnitz."
          className="w-full bg-[#1A1A1A] border border-[#444] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] resize-none transition"
        />
        <p className="text-right text-[10px] text-gray-600 mt-0.5">{description.length}/300</p>
      </div>

      {/* Küchen-Typ */}
      <div>
        <label htmlFor="profile-cuisine" className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Küchen-Typ
        </label>
        <div className="flex gap-2">
          <select
            id="profile-cuisine"
            value={cuisineType}
            onChange={(e) => setCuisineType(e.target.value)}
            className="flex-1 bg-[#1A1A1A] border border-[#444] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition appearance-none"
          >
            <option value="">-- Bitte wählen --</option>
            {CUISINE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <input
            type="text"
            value={cuisineType}
            onChange={(e) => setCuisineType(e.target.value)}
            placeholder="oder eigener Text"
            className="flex-1 bg-[#1A1A1A] border border-[#444] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
          />
        </div>
      </div>

      {/* Adresse */}
      <div>
        <label htmlFor="profile-address" className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Adresse
        </label>
        <input
          id="profile-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Hauptstraße 1, 09111 Chemnitz"
          className="w-full bg-[#1A1A1A] border border-[#444] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
        />
      </div>

      {/* Telefon */}
      <div>
        <label htmlFor="profile-phone" className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Telefonnummer
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+49 371 123456"
          className="w-full bg-[#1A1A1A] border border-[#444] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
        />
      </div>

      {/* Cover-Bild URL */}
      <div>
        <label htmlFor="profile-cover" className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Cover-Bild URL
        </label>
        <input
          id="profile-cover"
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://... (Supabase Storage URL)"
          className="w-full bg-[#1A1A1A] border border-[#444] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
        />
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt="Cover-Vorschau"
            className="mt-2 h-24 w-full object-cover rounded-lg border border-[#333]"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
      </div>

      {/* Öffnungszeiten */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Öffnungszeiten</p>
        <div className="space-y-2">
          {DAY_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
              <input
                type="text"
                value={hours[key] ?? ''}
                onChange={(e) => setHourForDay(key, e.target.value)}
                placeholder='z.B. "11:00–22:00" oder "geschlossen"'
                className="flex-1 bg-[#1A1A1A] border border-[#444] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          Tipp: Leer lassen = dieser Tag wird nicht angezeigt. &quot;geschlossen&quot; wird als geschlossen markiert.
        </p>
      </div>

      {/* Speichern-Button */}
      <div className="flex justify-end pt-2">
        <button
          id="profile-save-btn"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#C7A17A] hover:bg-[#b8906a] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-150 disabled:opacity-60 shadow-sm hover:shadow-md"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Store className="w-4 h-4" />
          )}
          {isSaving ? 'Speichert…' : saved ? 'Gespeichert!' : 'Profil speichern'}
        </button>
      </div>
    </div>
  )
}
