"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Store, Clock, Copy, Plus, X } from 'lucide-react'
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
  { key: 'mo', label: 'Montag', short: 'Mo' },
  { key: 'di', label: 'Dienstag', short: 'Di' },
  { key: 'mi', label: 'Mittwoch', short: 'Mi' },
  { key: 'do', label: 'Donnerstag', short: 'Do' },
  { key: 'fr', label: 'Freitag', short: 'Fr' },
  { key: 'sa', label: 'Samstag', short: 'Sa' },
  { key: 'so', label: 'Sonntag', short: 'So' },
]

// Generate time options from 00:00 to 23:45 in 15-min intervals
const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}
TIME_OPTIONS.push('00:00') // allow "midnight" as closing time meaning end of day

type DaySchedule = {
  open: boolean
  ranges: { from: string; to: string }[]
}

// Parse a stored string like "11:00–22:00" or "11:00–14:00, 17:00–22:00" or "geschlossen"
function parseHoursString(str: string | undefined): DaySchedule {
  if (!str || str.toLowerCase() === 'geschlossen') {
    return { open: !!str && str.toLowerCase() !== 'geschlossen' ? true : str ? false : false, ranges: [{ from: '11:00', to: '22:00' }] }
  }
  // Handle "geschlossen"
  if (str.toLowerCase().includes('geschlossen')) {
    return { open: false, ranges: [{ from: '11:00', to: '22:00' }] }
  }
  // Parse ranges: "11:00–14:00, 17:00–22:00"
  const parts = str.split(',').map(s => s.trim())
  const ranges: { from: string; to: string }[] = []
  for (const part of parts) {
    const [a, b] = part.split(/[–\-]/).map(s => s.trim())
    if (a && b) {
      ranges.push({ from: a, to: b })
    }
  }
  if (ranges.length === 0) {
    ranges.push({ from: '11:00', to: '22:00' })
  }
  return { open: true, ranges }
}

// Serialize DaySchedule back to string format
function serializeSchedule(schedule: DaySchedule): string {
  if (!schedule.open) return 'geschlossen'
  return schedule.ranges.map(r => `${r.from}–${r.to}`).join(', ')
}

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

  // Parse initial hours into structured format
  const initHours = (initialData.opening_hours as Record<string, string>) ?? {}
  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>(() => {
    const result: Record<string, DaySchedule> = {}
    for (const { key } of DAY_KEYS) {
      result[key] = parseHoursString(initHours[key])
    }
    return result
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyAllHint, setApplyAllHint] = useState(false)

  const updateDay = useCallback((dayKey: string, updates: Partial<DaySchedule>) => {
    setSchedules(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], ...updates },
    }))
  }, [])

  const updateRange = useCallback((dayKey: string, rangeIndex: number, field: 'from' | 'to', value: string) => {
    setSchedules(prev => {
      const day = prev[dayKey]
      const newRanges = [...day.ranges]
      newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value }
      return { ...prev, [dayKey]: { ...day, ranges: newRanges } }
    })
  }, [])

  const addBreak = useCallback((dayKey: string) => {
    setSchedules(prev => {
      const day = prev[dayKey]
      if (day.ranges.length >= 3) return prev
      const lastTo = day.ranges[day.ranges.length - 1]?.to ?? '14:00'
      // Suggest a break: last closing + 2h
      const lastIdx = TIME_OPTIONS.indexOf(lastTo)
      const newFrom = TIME_OPTIONS[Math.min(lastIdx + 8, TIME_OPTIONS.length - 1)] ?? '17:00'
      const newTo = '22:00'
      return {
        ...prev,
        [dayKey]: { ...day, ranges: [...day.ranges, { from: newFrom, to: newTo }] },
      }
    })
  }, [])

  const removeRange = useCallback((dayKey: string, rangeIndex: number) => {
    setSchedules(prev => {
      const day = prev[dayKey]
      if (day.ranges.length <= 1) return prev
      const newRanges = day.ranges.filter((_, i) => i !== rangeIndex)
      return { ...prev, [dayKey]: { ...day, ranges: newRanges } }
    })
  }, [])

  const applyToAllDays = useCallback((sourceDayKey: string) => {
    setSchedules(prev => {
      const source = prev[sourceDayKey]
      const result: Record<string, DaySchedule> = {}
      for (const { key } of DAY_KEYS) {
        result[key] = { open: source.open, ranges: source.ranges.map(r => ({ ...r })) }
      }
      return result
    })
    setApplyAllHint(true)
    setTimeout(() => setApplyAllHint(false), 2000)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)

    // Convert schedules back to string format
    const hours: Record<string, string> = {}
    for (const { key } of DAY_KEYS) {
      hours[key] = serializeSchedule(schedules[key])
    }

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

      {/* ─── Öffnungszeiten (Redesigned) ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C7A17A]" />
            Öffnungszeiten
          </p>
        </div>

        <div className="space-y-1">
          {DAY_KEYS.map(({ key, label, short }, dayIndex) => {
            const schedule = schedules[key]
            return (
              <div
                key={key}
                className={`rounded-xl border transition-all duration-200 ${
                  schedule.open
                    ? 'bg-[#1A1A1A] border-[#333]'
                    : 'bg-[#141414] border-[#222]'
                }`}
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Day label */}
                  <span className={`text-xs font-semibold w-10 flex-shrink-0 transition-colors ${
                    schedule.open ? 'text-white' : 'text-gray-600'
                  }`}>
                    {short}
                  </span>

                  {/* Toggle Switch */}
                  <button
                    id={`toggle-${key}`}
                    type="button"
                    onClick={() => updateDay(key, { open: !schedule.open })}
                    className={`relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#C7A17A]/40 ${
                      schedule.open ? 'bg-[#C7A17A]' : 'bg-[#333]'
                    }`}
                    aria-label={`${label} ${schedule.open ? 'schließen' : 'öffnen'}`}
                  >
                    <span className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      schedule.open ? 'translate-x-[22px]' : 'translate-x-[3px]'
                    }`} />
                  </button>

                  {schedule.open ? (
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      {schedule.ranges.map((range, rangeIndex) => (
                        <div key={rangeIndex} className="flex items-center gap-1.5">
                          {rangeIndex > 0 && (
                            <span className="text-[9px] text-gray-600 font-medium uppercase tracking-wider mr-0.5">+</span>
                          )}
                          <select
                            value={range.from}
                            onChange={(e) => updateRange(key, rangeIndex, 'from', e.target.value)}
                            className="bg-[#222] border border-[#3a3a3a] rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#C7A17A] transition appearance-none cursor-pointer min-w-[72px]"
                          >
                            {TIME_OPTIONS.map(t => (
                              <option key={`${key}-${rangeIndex}-from-${t}`} value={t}>{t}</option>
                            ))}
                          </select>
                          <span className="text-gray-600 text-xs">–</span>
                          <select
                            value={range.to}
                            onChange={(e) => updateRange(key, rangeIndex, 'to', e.target.value)}
                            className="bg-[#222] border border-[#3a3a3a] rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#C7A17A] transition appearance-none cursor-pointer min-w-[72px]"
                          >
                            {TIME_OPTIONS.map(t => (
                              <option key={`${key}-${rangeIndex}-to-${t}`} value={t}>{t}</option>
                            ))}
                          </select>

                          {/* Remove range button (only if >1 range) */}
                          {schedule.ranges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRange(key, rangeIndex)}
                              className="p-1 rounded-md hover:bg-red-950 text-gray-600 hover:text-red-400 transition-colors"
                              title="Zeitraum entfernen"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600 italic">Geschlossen</span>
                  )}

                  {/* Action buttons */}
                  {schedule.open && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {/* Add break */}
                      {schedule.ranges.length < 3 && (
                        <button
                          type="button"
                          onClick={() => addBreak(key)}
                          className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-gray-600 hover:text-[#C7A17A] transition-colors"
                          title="Pause hinzufügen (z.B. Mittagspause)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Apply to all */}
                      {dayIndex === 0 && (
                        <button
                          type="button"
                          onClick={() => applyToAllDays(key)}
                          className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-gray-600 hover:text-[#C7A17A] transition-colors"
                          title="Auf alle Tage übertragen"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Apply-All Quick Action */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-gray-600">
            <Plus className="w-3 h-3 inline -mt-px mr-0.5" /> = Pause hinzufügen &nbsp;·&nbsp;
            <Copy className="w-3 h-3 inline -mt-px mr-0.5" /> = Auf alle Tage kopieren
          </p>
          {applyAllHint && (
            <span className="text-[10px] text-[#C7A17A] font-medium animate-pulse">
              ✓ Auf alle Tage übertragen
            </span>
          )}
        </div>
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
