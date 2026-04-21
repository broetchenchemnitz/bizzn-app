'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  ALLERGEN_CATALOG, ADDITIVE_CATALOG, LABEL_CATALOG,
  type NutritionalInfo,
} from '@/lib/menu-constants'

// ═══════════════════════════════════════════════════════════════════════════════
// Wiederverwendbare Komponente für Allergene, Zusatzstoffe, Labels & Nährwerte
// Wird in AddMenuItemForm und EditMenuItemForm eingebunden
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  allergens: string[]
  additives: string[]
  labels: string[]
  nutritionalInfo: NutritionalInfo | null
  onChange: (data: {
    allergens: string[]
    additives: string[]
    labels: string[]
    nutritionalInfo: NutritionalInfo | null
  }) => void
  disabled?: boolean
}

export default function MenuItemDetailsEditor({
  allergens, additives, labels, nutritionalInfo, onChange, disabled = false,
}: Props) {
  const [showAllergens, setShowAllergens] = useState(allergens.length > 0)
  const [showAdditives, setShowAdditives] = useState(additives.length > 0)
  const [showNutrition, setShowNutrition] = useState(!!nutritionalInfo)

  const toggleCode = (list: string[], code: string): string[] =>
    list.includes(code) ? list.filter(c => c !== code) : [...list, code]

  return (
    <div className="space-y-3">

      {/* ── Labels (immer sichtbar als Pill-Buttons) ──────────────────── */}
      <div>
        <span className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Labels / Tags
        </span>
        <div className="flex flex-wrap gap-1.5">
          {LABEL_CATALOG.map(l => {
            const active = labels.includes(l.code)
            return (
              <button
                key={l.code}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ allergens, additives, labels: toggleCode(labels, l.code), nutritionalInfo })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all select-none disabled:opacity-40"
                style={{
                  background: active ? l.color + '22' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? l.color + '66' : 'rgba(255,255,255,0.08)'}`,
                  color: active ? l.color : '#6b7280',
                }}
              >
                <span>{l.emoji}</span>
                <span>{l.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Allergene (aufklappbar) ───────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAllergens(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-300 transition-colors w-full"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllergens ? 'rotate-0' : '-rotate-90'}`} />
          Allergene (EU-LMIV)
          {allergens.length > 0 && (
            <span className="text-[10px] font-bold text-[#C7A17A]/70 bg-[#C7A17A]/10 px-1.5 py-0.5 rounded ml-auto">
              {allergens.length} ausgewählt
            </span>
          )}
        </button>
        {showAllergens && (
          <div className="grid grid-cols-2 gap-1 mt-2">
            {ALLERGEN_CATALOG.map(a => {
              const active = allergens.includes(a.code)
              return (
                <label
                  key={a.code}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer select-none text-xs transition-all ${
                    active
                      ? 'bg-amber-900/20 border border-amber-700/40 text-amber-300'
                      : 'bg-[#1a1a1a] border border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                  } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onChange({ allergens: toggleCode(allergens, a.code), additives, labels, nutritionalInfo })}
                    className="sr-only"
                    disabled={disabled}
                  />
                  <span className="text-sm leading-none">{a.emoji}</span>
                  <span className="truncate">{a.label}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Zusatzstoffe (aufklappbar) ────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdditives(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-300 transition-colors w-full"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdditives ? 'rotate-0' : '-rotate-90'}`} />
          Zusatzstoffe
          {additives.length > 0 && (
            <span className="text-[10px] font-bold text-[#C7A17A]/70 bg-[#C7A17A]/10 px-1.5 py-0.5 rounded ml-auto">
              {additives.length} ausgewählt
            </span>
          )}
        </button>
        {showAdditives && (
          <div className="grid grid-cols-2 gap-1 mt-2">
            {ADDITIVE_CATALOG.map(a => {
              const active = additives.includes(a.code)
              return (
                <label
                  key={a.code}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer select-none text-xs transition-all ${
                    active
                      ? 'bg-blue-900/20 border border-blue-700/40 text-blue-300'
                      : 'bg-[#1a1a1a] border border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                  } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onChange({ allergens, additives: toggleCode(additives, a.code), labels, nutritionalInfo })}
                    className="sr-only"
                    disabled={disabled}
                  />
                  <span className="truncate">{a.label}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Nährwerte (aufklappbar) ───────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowNutrition(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-300 transition-colors w-full"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showNutrition ? 'rotate-0' : '-rotate-90'}`} />
          Nährwerte (optional)
        </button>
        {showNutrition && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { key: 'calories', label: 'kcal', placeholder: '450' },
              { key: 'protein', label: 'Protein (g)', placeholder: '25' },
              { key: 'carbs', label: 'Kohlenhydrate (g)', placeholder: '50' },
              { key: 'fat', label: 'Fett (g)', placeholder: '18' },
              { key: 'fiber', label: 'Ballaststoffe (g)', placeholder: '5' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 mb-0.5">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder={f.placeholder}
                  value={nutritionalInfo?.[f.key as keyof NutritionalInfo] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined
                    const updated = { ...(nutritionalInfo ?? {}), [f.key]: val } as NutritionalInfo
                    // Remove undefined keys
                    const cleaned = Object.fromEntries(
                      Object.entries(updated).filter(([, v]) => v !== undefined && v !== null)
                    ) as NutritionalInfo
                    onChange({
                      allergens, additives, labels,
                      nutritionalInfo: Object.keys(cleaned).length > 0 ? cleaned : null,
                    })
                  }}
                  disabled={disabled}
                  className="w-full bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none transition-all tabular-nums disabled:opacity-40"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
