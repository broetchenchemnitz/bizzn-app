// ═══════════════════════════════════════════════════════════════════════════════
// Menü-Konstanten: Allergene, Zusatzstoffe, Labels
// Zentrale Definitionen für Dashboard, Storefront & Import
// ═══════════════════════════════════════════════════════════════════════════════

// ── 14 EU-Hauptallergene gemäß LMIV (Verordnung 1169/2011) ──────────────────

export interface AllergenDef {
  code: string
  label: string
  emoji: string
}

export const ALLERGEN_CATALOG: AllergenDef[] = [
  { code: 'gluten',      label: 'Glutenhaltiges Getreide', emoji: '🌾' },
  { code: 'crustaceans',  label: 'Krebstiere',             emoji: '🦐' },
  { code: 'eggs',         label: 'Eier',                   emoji: '🥚' },
  { code: 'fish',         label: 'Fisch',                  emoji: '🐟' },
  { code: 'peanuts',      label: 'Erdnüsse',               emoji: '🥜' },
  { code: 'soy',          label: 'Soja',                   emoji: '🫘' },
  { code: 'milk',         label: 'Milch / Laktose',        emoji: '🥛' },
  { code: 'nuts',         label: 'Schalenfrüchte',         emoji: '🌰' },
  { code: 'celery',       label: 'Sellerie',               emoji: '🥬' },
  { code: 'mustard',      label: 'Senf',                   emoji: '🟡' },
  { code: 'sesame',       label: 'Sesam',                  emoji: '⚪' },
  { code: 'sulfites',     label: 'Sulfite / SO₂',          emoji: '🍷' },
  { code: 'lupins',       label: 'Lupinen',                emoji: '🌿' },
  { code: 'mollusks',     label: 'Weichtiere',             emoji: '🦪' },
]

// ── Zusatzstoffe ─────────────────────────────────────────────────────────────

export interface AdditiveDef {
  code: string
  label: string
}

export const ADDITIVE_CATALOG: AdditiveDef[] = [
  { code: 'colorants',         label: 'mit Farbstoff' },
  { code: 'preservatives',     label: 'mit Konservierungsstoff' },
  { code: 'antioxidants',      label: 'mit Antioxidationsmittel' },
  { code: 'flavor_enhancers',  label: 'mit Geschmacksverstärker' },
  { code: 'sweeteners',        label: 'mit Süßungsmittel' },
  { code: 'phosphate',         label: 'mit Phosphat' },
  { code: 'caffeine',          label: 'koffeinhaltig' },
  { code: 'quinine',           label: 'chininhaltig' },
  { code: 'waxed',             label: 'gewachst' },
  { code: 'blackened',         label: 'geschwärzt' },
]

// ── Labels / Tags ────────────────────────────────────────────────────────────

export interface LabelDef {
  code: string
  label: string
  emoji: string
  color: string   // Pill-Hintergrundfarbe (CSS)
}

export const LABEL_CATALOG: LabelDef[] = [
  { code: 'vegan',        label: 'Vegan',        emoji: '🌱', color: '#16a34a' },
  { code: 'vegetarian',   label: 'Vegetarisch',  emoji: '🥬', color: '#22c55e' },
  { code: 'spicy',        label: 'Scharf',       emoji: '🌶️', color: '#ef4444' },
  { code: 'halal',        label: 'Halal',        emoji: '☪️',  color: '#3b82f6' },
  { code: 'organic',      label: 'Bio',          emoji: '🌿', color: '#65a30d' },
  { code: 'gluten_free',  label: 'Glutenfrei',   emoji: '🚫', color: '#d97706' },
  { code: 'lactose_free', label: 'Laktosefrei',  emoji: '🚫', color: '#0891b2' },
  { code: 'new',          label: 'Neu',          emoji: '✨', color: '#a855f7' },
  { code: 'popular',      label: 'Beliebt',      emoji: '⭐', color: '#f59e0b' },
  { code: 'homemade',     label: 'Hausgemacht',  emoji: '👨‍🍳', color: '#C7A17A' },
]

// ── Nährwerte ────────────────────────────────────────────────────────────────

export interface NutritionalInfo {
  calories?: number   // kcal
  protein?: number    // g
  carbs?: number      // g
  fat?: number        // g
  fiber?: number      // g
}

// ── Lookup-Helfer ────────────────────────────────────────────────────────────

const allergenMap = new Map(ALLERGEN_CATALOG.map(a => [a.code, a]))
const additiveMap = new Map(ADDITIVE_CATALOG.map(a => [a.code, a]))
const labelMap = new Map(LABEL_CATALOG.map(l => [l.code, l]))

export function getAllergen(code: string): AllergenDef | undefined { return allergenMap.get(code) }
export function getAdditive(code: string): AdditiveDef | undefined { return additiveMap.get(code) }
export function getLabel(code: string): LabelDef | undefined { return labelMap.get(code) }

/** Alle gültigen Allergen-Codes (zum Validieren von Import-Daten) */
export const VALID_ALLERGEN_CODES = new Set(ALLERGEN_CATALOG.map(a => a.code))
export const VALID_ADDITIVE_CODES = new Set(ADDITIVE_CATALOG.map(a => a.code))
export const VALID_LABEL_CODES = new Set(LABEL_CATALOG.map(l => l.code))
