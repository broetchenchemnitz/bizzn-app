/**
 * M30: Slug-Generator für Restaurant-URLs
 * Erzeugt URL-sichere Slugs aus Restaurantnamen.
 * Beispiel: "Syriana Bistro & Café" → "syriana-bistro-cafe"
 */

const UMLAUT_MAP: Record<string, string> = {
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
  'Ä': 'ae', 'Ö': 'oe', 'Ü': 'ue',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'á': 'a', 'à': 'a', 'â': 'a',
  'ó': 'o', 'ò': 'o', 'ô': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u',
  'í': 'i', 'ì': 'i', 'î': 'i',
  'ñ': 'n', 'ç': 'c',
}

/**
 * Converts a restaurant name to a URL-safe slug.
 * - German umlauts → ae/oe/ue/ss
 * - Accented chars → ASCII equivalents
 * - Spaces/special chars → hyphens
 * - Multiple hyphens collapsed
 * - Leading/trailing hyphens removed
 * - Max 60 chars
 */
export function generateSlug(name: string): string {
  if (!name?.trim()) return ''

  let slug = name.trim().toLowerCase()

  // Replace known special characters
  slug = slug.replace(/[äöüßÄÖÜéèêëáàâóòôúùûíìîñç]/g, (char) => UMLAUT_MAP[char] ?? char)

  // Replace & with "und" (German)
  slug = slug.replace(/\s*&\s*/g, '-und-')

  // Remove everything except letters, numbers, spaces, hyphens
  slug = slug.replace(/[^a-z0-9\s-]/g, '')

  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-')

  // Collapse multiple hyphens
  slug = slug.replace(/-{2,}/g, '-')

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '')

  // Truncate to max 60 chars (at word boundary)
  if (slug.length > 60) {
    slug = slug.substring(0, 60)
    const lastHyphen = slug.lastIndexOf('-')
    if (lastHyphen > 30) {
      slug = slug.substring(0, lastHyphen)
    }
  }

  return slug
}

/**
 * Parses a German address string to extract city and postal code.
 * Supports formats like:
 * - "Musterstraße 1, 09111 Chemnitz"
 * - "09111 Chemnitz, Musterstraße 1"
 * - "Chemnitz"
 */
export function parseAddressComponents(address: string): {
  city: string | null
  postalCode: string | null
} {
  if (!address?.trim()) return { city: null, postalCode: null }

  // Try to find a German PLZ (5 digits)
  const plzMatch = address.match(/\b(\d{5})\s+([A-ZÄÖÜa-zäöüß][A-ZÄÖÜa-zäöüß\s-]+)/u)
  if (plzMatch) {
    return {
      postalCode: plzMatch[1],
      city: plzMatch[2].trim().replace(/[,.].*$/, '').trim(),
    }
  }

  // Fallback: Try city after comma
  const commaMatch = address.match(/,\s*(\d{5})?\s*([A-ZÄÖÜa-zäöüß][A-ZÄÖÜa-zäöüß\s-]+)\s*$/u)
  if (commaMatch) {
    return {
      postalCode: commaMatch[1] ?? null,
      city: commaMatch[2].trim(),
    }
  }

  return { city: null, postalCode: null }
}
