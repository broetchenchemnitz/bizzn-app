import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ── Supabase admin client ─────────────────────────────────────────────────────
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Gemini client ─────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParsedOption {
  name: string
  priceCents: number
}

interface ParsedOptionGroup {
  name: string
  isRequired: boolean
  maxSelect: number
  options: ParsedOption[]
}

interface ParsedItem {
  name: string
  description?: string
  price: number
  imageUrl?: string
  optionGroups: ParsedOptionGroup[]
  // Allergene, Zusatzstoffe, Labels
  allergens?: string[]
  additives?: string[]
  labels?: string[]
}

interface ParsedCategory {
  name: string
  items: ParsedItem[]
}

// M30: Extrahierte Profildaten
interface ParsedProfile {
  restaurantName?: string
  description?: string
  address?: string
  phone?: string
  openingHours?: Record<string, string>  // { "Montag": "11:00–22:00", ... }
  cuisineType?: string
  coverImageUrl?: string
}

interface ParsedMenu {
  categories: ParsedCategory[]
  profile?: ParsedProfile
}

// ── Platform detection ────────────────────────────────────────────────────────
const KNOWN_PLATFORMS = [
  { id: 'wolt', pattern: /wolt\.com/i, name: 'Wolt' },
  { id: 'ubereats', pattern: /ubereats\.com/i, name: 'Uber Eats' },
] as const

function detectPlatform(url: string): { id: string; name: string } | null {
  for (const p of KNOWN_PLATFORMS) {
    if (p.pattern.test(url)) return { id: p.id, name: p.name }
  }
  return null
}

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// ── Helper: scrape a single URL via Browserless ──────────────────────────────
async function scrapeUrl(
  url: string,
  baseUrl: string,
  token: string,
  formats: string[] = ['markdown', 'screenshot']
): Promise<{ ok: boolean; markdown?: string; screenshot?: string; strategy?: string; error?: string }> {
  try {
    const response = await fetch(
      `${baseUrl}/smart-scrape?token=${token}&timeout=60000`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formats }),
      }
    )

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    if (!data.ok) {
      return { ok: false, error: data.message ?? 'Scrape failed' }
    }

    return {
      ok: true,
      markdown: data.markdown ?? null,
      screenshot: data.screenshot ?? null,
      strategy: data.strategy,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Helper: direct HTTP fetch fallback (works for SSR pages like Wolt) ────────
async function scrapeUrlDirect(
  url: string
): Promise<{ ok: boolean; markdown?: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    if (!html || html.length < 200) {
      return { ok: false, error: 'Empty response from server' }
    }

    // Convert HTML to simple markdown-like text
    const markdown = htmlToSimpleMarkdown(html)

    if (markdown.length < 100) {
      return { ok: false, error: 'No meaningful content extracted' }
    }

    return { ok: true, markdown }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Direct fetch failed' }
  }
}

// ── Helper: convert HTML to simple markdown text ─────────────────────────────
function htmlToSimpleMarkdown(html: string): string {
  let text = html

  // Remove script, style, noscript tags and their content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Convert headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')

  // Convert line breaks and paragraphs
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<p[^>]*>/gi, '')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<div[^>]*>/gi, '')

  // Convert lists
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
  text = text.replace(/<\/?[uo]l[^>]*>/gi, '\n')

  // Extract link text
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')

  // Convert images to capture alt text and src
  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '[$1]')
  text = text.replace(/<img[^>]*>/gi, '')

  // Bold/italic
  text = text.replace(/<\/?(?:b|strong)[^>]*>/gi, '**')
  text = text.replace(/<\/?(?:i|em)[^>]*>/gi, '_')

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&euro;/g, '€')
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ')           // collapse horizontal whitespace
  text = text.replace(/\n[ \t]+/g, '\n')         // trim leading whitespace on lines
  text = text.replace(/[ \t]+\n/g, '\n')         // trim trailing whitespace on lines
  text = text.replace(/\n{3,}/g, '\n\n')         // max 2 consecutive newlines
  text = text.trim()

  return text
}

// ── Helper: extract category sub-page links from Wolt markdown ───────────────
function extractWoltCategoryLinks(markdown: string, baseUrl: string): { name: string; url: string }[] {
  const links: { name: string; url: string }[] = []
  const regex = /\[(?:!\[.*?\]\(.*?\)\s*)?([^\]]+)\]\((\/(de|en)\/\w+\/\w+\/restaurant\/[^/]+\/items\/[^\)]+)\)/g
  let match
  while ((match = regex.exec(markdown)) !== null) {
    const name = match[1].replace(/[🍗🍔🧀🌱🥪🍛🔥🌟💧🥤🍰📦]/g, '').trim()
    const path = match[2]
    const origin = new URL(baseUrl).origin
    links.push({ name, url: `${origin}${path}` })
  }
  return links
}

// ── Helper: extract category sub-page links from Lieferando markdown ─────────
function extractLieferandoCategoryLinks(markdown: string, originalUrl: string): string[] {
  return []
}

// ── Wolt Native JSON Parser ──────────────────────────────────────────────────
// Wolt embeds full menu data as structured JSON in <script type="application/json"> tags.
// This is far more reliable than HTML parsing + Gemini.
interface WoltJsonCategory {
  id: string
  name: string
  slug: string
  images?: { url: string }[]
  item_ids: string[]
}
interface WoltJsonItem {
  id: string
  name: string
  description?: string
  price: number // cents
  images?: { url: string }[]
  is_cutlery?: boolean
  // Allergens can be string[] or object[] e.g. {name:"wheat"} depending on Wolt API version
  allergens?: unknown[]
  dietary_flags?: unknown[]
  dietary_labels?: unknown[]
  tags?: unknown[]
  allergen_info?: string // plain text fallback e.g. "Contains gluten, sesame"
  options?: {
    id: string
    option_id: string
    name: string
    multi_choice_config?: { total_range?: { min: number; max: number } }
  }[]
}
interface WoltJsonOption {
  id: string
  name: string
  type: string
  values: {
    id: string
    name: string
    price: number
  }[]
}
interface WoltMenuData {
  categories: WoltJsonCategory[]
  items: WoltJsonItem[]
  options: WoltJsonOption[]
}

// M30: Wolt venue data for profile extraction
interface WoltVenueData {
  name?: string
  short_description?: string
  description?: string
  address?: string | { street_address?: string; city?: string; post_code?: string; formatted_address?: string }
  phone?: string
  opening_times?: { opening_day: string; opening_time: string; closing_time: string }[]
  tags?: string[]
  mainimage?: { url: string }
  hero_image?: { url: string }
  profile_image?: { url: string }
  images?: { url: string }[]
}

async function tryWoltNativeParse(url: string): Promise<ParsedMenu | null> {
  try {
    console.log('[M29] Wolt: Trying native JSON extraction...')
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.log(`[M29] Wolt native: HTTP ${response.status}`)
      return null
    }

    const html = await response.text()

    // Extract all <script type="application/json"> blocks
    const jsonBlocks = html.match(new RegExp('<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>', 'gs'))
    if (!jsonBlocks) {
      console.log('[M29] Wolt native: No JSON script blocks found')
      return null
    }

    // Find the large block containing menu data (queries with categories+items)
    let menuData: WoltMenuData | null = null
    // M30: Also extract venue/profile data
    let venueData: WoltVenueData | null = null

    for (const block of jsonBlocks) {
      const jsonContent = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')

      try {
        const parsed = JSON.parse(jsonContent)
        if (!parsed.queries) continue

        for (const query of parsed.queries) {
          const data = query?.state?.data
          if (!data || typeof data !== 'object') continue

          // Menu data (categories + items)
          if (
            !menuData &&
            Array.isArray(data.categories) &&
            Array.isArray(data.items) &&
            data.categories.length > 0 &&
            data.items.length > 0
          ) {
            menuData = data as WoltMenuData
          }

          // M30: Venue/profile data — look for venue object with name + address
          if (!venueData) {
            const venue = data.venue ?? data
            if (venue && typeof venue === 'object' && venue.name && typeof venue.name === 'string') {
              // Must have at least name to be valid venue data
              if (venue.address || venue.short_description || venue.opening_times) {
                venueData = venue as WoltVenueData
                console.log(`[M30] Wolt native: Found venue data for "${venue.name}"`)
              }
            }
          }
        }
        if (menuData && venueData) break
      } catch {
        continue
      }
    }

    if (!menuData) {
      console.log('[M29] Wolt native: No menu data found in JSON blocks')
      return null
    }

    console.log(`[M29] Wolt native: Found ${menuData.categories.length} categories, ${menuData.items.length} items, ${menuData.options?.length ?? 0} options`)

    // Build items lookup map
    const itemsMap = new Map<string, WoltJsonItem>()
    for (const item of menuData.items) {
      itemsMap.set(item.id, item)
    }

    // Build options lookup map
    const optionsMap = new Map<string, WoltJsonOption>()
    for (const opt of (menuData.options ?? [])) {
      optionsMap.set(opt.id, opt)
    }

    // Convert to our ParsedMenu format
    const categories: ParsedCategory[] = []

    for (const cat of menuData.categories) {
      const items: ParsedItem[] = []

      for (const itemId of cat.item_ids) {
        const woltItem = itemsMap.get(itemId)
        if (!woltItem) continue
        // Skip cutlery items
        if (woltItem.is_cutlery) continue

        // Build option groups
        const optionGroups: ParsedOptionGroup[] = []
        for (const itemOpt of (woltItem.options ?? [])) {
          const optionDef = optionsMap.get(itemOpt.option_id)
          if (!optionDef || !optionDef.values?.length) continue

          const minSelect = itemOpt.multi_choice_config?.total_range?.min ?? 0
          const maxSelect = itemOpt.multi_choice_config?.total_range?.max ?? optionDef.values.length

          optionGroups.push({
            name: itemOpt.name || optionDef.name,
            isRequired: minSelect > 0,
            maxSelect,
            options: optionDef.values.map(v => ({
              name: v.name,
              priceCents: v.price ?? 0,
            })),
          })
        }

        // Get the best image URL
        const imageUrl = woltItem.images?.[0]?.url ?? undefined

        // Extract allergens & labels from Wolt data
        const itemAllergens: string[] = []
        const itemLabels: string[] = []
        const woltAllergenMap: Record<string, string> = {
          'gluten': 'gluten', 'wheat': 'gluten', 'barley': 'gluten', 'rye': 'gluten', 'oats': 'gluten',
          'crustacean': 'crustaceans', 'shrimp': 'crustaceans', 'crab': 'crustaceans', 'lobster': 'crustaceans',
          'egg': 'eggs', 'eggs': 'eggs',
          'fish': 'fish',
          'peanut': 'peanuts', 'peanuts': 'peanuts',
          'soy': 'soy', 'soya': 'soy', 'soybeans': 'soy',
          'milk': 'milk', 'dairy': 'milk', 'lactose': 'milk',
          'nut': 'nuts', 'nuts': 'nuts', 'tree_nuts': 'nuts', 'almond': 'nuts', 'hazelnut': 'nuts', 'walnut': 'nuts', 'cashew': 'nuts', 'pistachio': 'nuts',
          'celery': 'celery',
          'mustard': 'mustard',
          'sesame': 'sesame',
          'sulphite': 'sulfites', 'sulfite': 'sulfites', 'sulphur': 'sulfites', 'so2': 'sulfites',
          'lupin': 'lupins', 'lupine': 'lupins',
          'mollusc': 'mollusks', 'mollusk': 'mollusks', 'squid': 'mollusks', 'octopus': 'mollusks', 'mussel': 'mollusks', 'oyster': 'mollusks', 'snail': 'mollusks',
        }
        const woltLabelMap: Record<string, string> = {
          'vegan': 'vegan', 'vegetarian': 'vegetarian', 'spicy': 'spicy', 'hot': 'spicy',
          'halal': 'halal', 'organic': 'organic', 'bio': 'organic',
          'gluten_free': 'gluten_free', 'gluten-free': 'gluten_free',
          'lactose_free': 'lactose_free', 'lactose-free': 'lactose_free', 'dairy_free': 'lactose_free',
          'popular': 'popular', 'new': 'new', 'homemade': 'homemade',
        }

        // Parse Wolt allergen fields
        // Wolt kann Allergene als string[] ODER als Objekte mit {name: string} senden
        const extractAllergenKey = (raw: unknown): string => {
          if (typeof raw === 'string') return raw.toLowerCase().trim()
          if (raw && typeof raw === 'object') {
            const obj = raw as Record<string, unknown>
            // Wolt sendet z.B. { name: "wheat" } oder { sku: "gluten" } oder { type: "sesame" }
            const val = obj.name ?? obj.sku ?? obj.type ?? obj.code ?? obj.key ?? ''
            return String(val).toLowerCase().trim()
          }
          return ''
        }

        for (const src of [woltItem.allergens, woltItem.dietary_flags, woltItem.dietary_labels, woltItem.tags]) {
          if (!Array.isArray(src)) continue
          for (const raw of src) {
            const key = extractAllergenKey(raw)
            if (!key) continue
            if (woltAllergenMap[key] && !itemAllergens.includes(woltAllergenMap[key])) {
              itemAllergens.push(woltAllergenMap[key])
            }
            if (woltLabelMap[key] && !itemLabels.includes(woltLabelMap[key])) {
              itemLabels.push(woltLabelMap[key])
            }
          }
        }

        // Fallback: Allergen-Info als String (z.B. "Contains gluten, sesame")
        if (woltItem.allergen_info && typeof woltItem.allergen_info === 'string') {
          const words = woltItem.allergen_info.toLowerCase().split(/[\s,;.]+/)
          for (const word of words) {
            if (woltAllergenMap[word] && !itemAllergens.includes(woltAllergenMap[word])) {
              itemAllergens.push(woltAllergenMap[word])
            }
          }
        }

        items.push({
          name: woltItem.name,
          description: woltItem.description || undefined,
          price: woltItem.price / 100,
          imageUrl,
          optionGroups,
          allergens: itemAllergens.length > 0 ? itemAllergens : undefined,
          labels: itemLabels.length > 0 ? itemLabels : undefined,
        })
      }

      if (items.length === 0) continue

      categories.push({
        name: cat.name.replace(/[^\w\s\-äöüÄÖÜß&+.,()]/g, '').trim(), // Strip emojis from category name
        items,
      })
    }

    if (categories.length === 0) return null

    // M30: Build profile from venue data
    let profile: ParsedProfile | undefined = undefined
    if (venueData) {
      profile = extractWoltProfile(venueData)
      console.log(`[M30] Wolt native: ✅ Profile extracted — name: "${profile.restaurantName}", address: "${profile.address ?? 'n/a'}", cuisine: "${profile.cuisineType ?? 'n/a'}"`)
    }

    console.log(`[M29] Wolt native: ✅ Converted ${categories.length} categories with ${categories.reduce((s, c) => s + c.items.length, 0)} items`)
    return { categories, profile }
  } catch (err) {
    console.error('[M29] Wolt native parse error:', err)
    return null
  }
}

// M30: Extract profile from Wolt venue JSON data
function extractWoltProfile(venue: WoltVenueData): ParsedProfile {
  const profile: ParsedProfile = {}

  // Name
  if (venue.name) {
    profile.restaurantName = venue.name.trim()
  }

  // Description
  if (venue.short_description) {
    profile.description = venue.short_description.trim()
  } else if (venue.description) {
    profile.description = venue.description.trim().substring(0, 200)
  }

  // Address
  if (venue.address) {
    if (typeof venue.address === 'string') {
      profile.address = venue.address.trim()
    } else if (typeof venue.address === 'object') {
      const a = venue.address
      if (a.formatted_address) {
        profile.address = a.formatted_address.trim()
      } else {
        const parts = [a.street_address, a.post_code, a.city].filter(Boolean)
        if (parts.length > 0) profile.address = parts.join(', ')
      }
    }
  }

  // Phone
  if (venue.phone) {
    profile.phone = venue.phone.trim()
  }

  // Opening hours
  if (venue.opening_times && Array.isArray(venue.opening_times) && venue.opening_times.length > 0) {
    const DAYS_DE: Record<string, string> = {
      'monday': 'Montag', 'tuesday': 'Dienstag', 'wednesday': 'Mittwoch',
      'thursday': 'Donnerstag', 'friday': 'Freitag', 'saturday': 'Samstag', 'sunday': 'Sonntag',
    }
    const hours: Record<string, string> = {}
    for (const slot of venue.opening_times) {
      const dayKey = slot.opening_day?.toLowerCase()
      const dayName = DAYS_DE[dayKey] ?? slot.opening_day
      if (dayName && slot.opening_time && slot.closing_time) {
        const timeStr = `${slot.opening_time}–${slot.closing_time}`
        // Append if day already has hours (multiple slots per day)
        hours[dayName] = hours[dayName] ? `${hours[dayName]}, ${timeStr}` : timeStr
      }
    }
    if (Object.keys(hours).length > 0) {
      profile.openingHours = hours
    }
  }

  // Cuisine type from tags
  if (venue.tags && Array.isArray(venue.tags) && venue.tags.length > 0) {
    // Take first meaningful tag as cuisine type
    const cuisineTags = venue.tags.filter(t => typeof t === 'string' && t.length > 1)
    if (cuisineTags.length > 0) {
      profile.cuisineType = cuisineTags.slice(0, 3).join(', ')
    }
  }

  // Cover image
  const coverUrl = venue.mainimage?.url ?? venue.hero_image?.url ?? venue.profile_image?.url ?? venue.images?.[0]?.url
  if (coverUrl) {
    profile.coverImageUrl = coverUrl
  }

  return profile
}

// ── POST /api/menu/url-import ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, projectId } = await req.json()

    // ── Validate inputs ────────────────────────────────────────────────────
    if (!url?.trim()) {
      return NextResponse.json({ error: 'Keine URL angegeben.' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID fehlt.' }, { status: 400 })
    }
    if (!isValidUrl(url)) {
      return NextResponse.json({ error: 'Ungültige URL. Bitte eine vollständige URL mit https:// angeben.' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert.' }, { status: 500 })
    }

    const platform = detectPlatform(url)
    const browserlessBase = process.env.BROWSERLESS_BASE_URL || 'https://production-ams.browserless.io'
    const token = process.env.BROWSERLESS_API_TOKEN

    // ── Step 1: Scrape & Parse ─────────────────────────────────────────────
    console.log(`[M29] Scraping URL: ${url} (platform: ${platform?.id ?? 'unknown'})`)




    // ── Strategy 0: Native JSON parser for known platforms (no Gemini needed!) ──
    if (platform?.id === 'wolt') {
      const nativeMenu = await tryWoltNativeParse(url)
      if (nativeMenu && nativeMenu.categories.length > 0) {
        // Success! Return directly — no Gemini needed
        const totalItems = nativeMenu.categories.reduce((sum, cat) => sum + cat.items.length, 0)
        const totalOptions = nativeMenu.categories.reduce(
          (sum, cat) => sum + cat.items.reduce(
            (s, item) => s + (item.optionGroups ?? []).reduce(
              (os, g) => os + (g.options?.length ?? 0), 0
            ), 0
          ), 0
        )
        const imageUrls = nativeMenu.categories.flatMap(cat =>
          cat.items.filter(item => item.imageUrl).map(item => item.imageUrl!)
        )

        console.log(`[M29] ✅ Wolt native: ${nativeMenu.categories.length} categories, ${totalItems} items, ${totalOptions} options, ${imageUrls.length} images`)

        return NextResponse.json({
          success: true,
          platform: platform.id,
          platformName: platform.name,
          sourceUrl: url,
          scrapedAt: new Date().toISOString(),
          categories: nativeMenu.categories,
          // M30: Profile data
          profile: nativeMenu.profile ?? null,
          stats: {
            categories: nativeMenu.categories.length,
            items: totalItems,
            options: totalOptions,
            images: imageUrls.length,
          },
        })
      }
      console.log('[M29] Wolt native parse failed, falling back to generic strategy...')
    }

    // ── Generic strategy: Scrape HTML → Gemini AI parsing ─────────────────
    let combinedMarkdown = ''
    let screenshot: string | null = null
    let scrapeStrategy = 'none'

    // ── Strategy A: Direct HTTP fetch (fast, no Browserless credits) ─────
    console.log('[M29] Trying direct HTTP fetch first...')
    const directScrape = await scrapeUrlDirect(url)

    if (directScrape.ok && directScrape.markdown && directScrape.markdown.length > 500) {
      combinedMarkdown = directScrape.markdown
      scrapeStrategy = 'direct-fetch'
      console.log(`[M29] Direct fetch OK — ${combinedMarkdown.length} chars`)
    } else {
      console.log(`[M29] Direct fetch insufficient (${directScrape.markdown?.length ?? 0} chars): ${directScrape.error ?? 'too short'}`)

      // ── Strategy B: Browserless smart-scrape (for JS-heavy SPAs) ──────
      if (token && token !== 'YOUR_BROWSERLESS_TOKEN_HERE') {
        console.log('[M29] Falling back to Browserless smart-scrape...')
        const mainScrape = await scrapeUrl(url, browserlessBase, token)

        if (mainScrape.ok) {
          combinedMarkdown = mainScrape.markdown ?? ''
          screenshot = mainScrape.screenshot ?? null
          scrapeStrategy = `browserless-${mainScrape.strategy ?? 'unknown'}`
          console.log(`[M29] Browserless OK — ${combinedMarkdown.length} chars, Screenshot: ${screenshot ? 'yes' : 'no'}`)
        } else {
          console.error('[M29] Browserless also failed:', mainScrape.error)
        }
      } else {
        console.log('[M29] No Browserless token configured, skipping fallback')
      }
    }

    if (!combinedMarkdown && !screenshot) {
      return NextResponse.json(
        { error: 'Seite konnte nicht geladen werden. Bitte prüfe die URL oder nutze den Foto-Import als Alternative.', fallback: true },
        { status: 422 }
      )
    }

    console.log(`[M29] Final scrape strategy: ${scrapeStrategy}, content: ${combinedMarkdown.length} chars`)

    // ── Step 2: Gemini AI Parsing ────────────────────────────────────────

    const platformHint = platform
      ? `Die Quelle ist ${platform.name} (${url}).`
      : `Die Quelle ist eine Restaurant-Website (${url}).`

    const prompt = `Du bist ein Experte für Gastronomie-Digitalisierung.
Du erhältst den Inhalt einer Online-Speisekarte (Markdown-Text, evtl. aus mehreren Unterseiten zusammengesetzt).
${platformHint}

Extrahiere ALLE Gerichte mit Kategorien, Preisen, Beschreibungen und Optionen / Extras.
Extrahiere außerdem das Restaurant-Profil (sofern erkennbar).

WICHTIG: Antworte NUR mit validem JSON ohne Markdown-Codeblöcke oder Erklärungen.

JSON-Format:
{
  "profile": {
    "restaurantName": "Name des Restaurants (wenn erkennbar)",
    "description": "Kurze Beschreibung / Über uns-Text (max 200 Zeichen, wenn vorhanden)",
    "address": "Vollständige Adresse mit Straße, PLZ und Stadt (wenn vorhanden)",
    "phone": "Telefonnummer (wenn vorhanden)",
    "openingHours": {
      "Montag": "11:00–22:00",
      "Dienstag": "11:00–22:00"
    },
    "cuisineType": "Küchen-Typ, z.B. Syrisch, Italienisch, Pizza & Burger (wenn erkennbar)",
    "coverImageUrl": "URL des Restaurant-/Headerbildes (nur vollständige URL, wenn erkennbar)"
  },
  "categories": [
    {
      "name": "Kategoriename",
      "items": [
        {
          "name": "Gerichtname",
          "description": "Beschreibung (max 150 Zeichen, leer wenn nicht vorhanden)",
          "price": 8.50,
          "imageUrl": "https://... (nur wenn vollständige Bild-URL im Text erkennbar, sonst weglassen)",
          "allergens": ["gluten", "milk"],
          "additives": ["colorants"],
          "labels": ["vegan", "popular"],
          "optionGroups": [
            {
              "name": "Gruppenname (z.B. Größe, Extras, Beilagen, Soße)",
              "isRequired": true,
              "maxSelect": 1,
              "options": [
                { "name": "Optionsname", "priceCents": 0 }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Profil-Regeln:
- Felder die nicht erkennbar sind → weglassen (nicht null oder leere Strings)
- openingHours: Wochentage auf Deutsch (Montag-Sonntag), Format "HH:MM–HH:MM". Wenn "geschlossen" dann "geschlossen"
- coverImageUrl: Nur vollständige URLs, keine relativen Pfade
- cuisineType: Auf Deutsch normalisieren

Speisekarten-Regeln:
- Preise als Dezimalzahl in Euro (z.B. 8.50, nicht "8,50 €")
- Wenn kein Preis erkennbar: setze 0
- Optionspreis in Cent (Aufpreis, z.B. +1,50€ → 150). Basis-Option = 0
- Wenn ein Gericht keine Optionen hat: optionGroups = []
- isRequired = true wenn "Pflicht", "Wähle eine...", "Bitte wählen" erkennbar
- maxSelect: 1 bei Einzelauswahl (z.B. Größe), bei Extras/Beilagen die Obergrenze wenn erkennbar, sonst 99
- Kategorienamen auf Deutsch normalisieren (z.B. "Starters" → "Vorspeisen")
- Gerichte mit gleichem Namen aber verschiedenen Größen/Varianten → als Optionsgruppe zusammenfassen
- Beilagen/Extras die zu mehreren Gerichten gehören → trotzdem am jeweiligen Gericht auflisten
- Ignoriere Navigation, Footer, Cookie-Banner, Warenkorb-Elemente und andere UI-Texte
- Wenn der Text "--- KATEGORIE: xyz ---" Marker enthält, nutze die Abschnitte als Kategorie-Grenzen

Speisekarten-Inhalt (Markdown):
${combinedMarkdown.substring(0, 80000)}
`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Build content parts: prompt + screenshot (always include screenshot when available for better accuracy)
    const useScreenshot = !!screenshot
    const contentParts: Parameters<typeof model.generateContent>[0] = useScreenshot
      ? [
          prompt,
          {
            inlineData: {
              mimeType: 'image/png',
              data: screenshot,
            },
          },
        ]
      : [prompt]

    console.log(`[M29] Sending to Gemini (${prompt.length} chars, screenshot: ${useScreenshot ? 'yes' : 'no'})`)

    const result = await model.generateContent(contentParts)
    const rawText = result.response.text().trim()

    // ── Step 3: Parse JSON ───────────────────────────────────────────────
    let menu: ParsedMenu
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      menu = JSON.parse(cleaned)
    } catch {
      console.error('[M29] AI response parse error. Raw:', rawText.substring(0, 300))
      return NextResponse.json(
        { error: 'KI-Antwort konnte nicht verarbeitet werden. Bitte nutze den Foto-Import als Alternative.', fallback: true },
        { status: 422 }
      )
    }


    if (!menu.categories || !Array.isArray(menu.categories) || menu.categories.length === 0) {
      return NextResponse.json(
        { error: 'Keine Gerichte auf der Seite gefunden. Ist die URL eine Speisekarte?', fallback: true },
        { status: 422 }
      )
    }

    // Filter out empty categories
    menu.categories = menu.categories.filter(cat => cat.items && cat.items.length > 0)

    if (menu.categories.length === 0) {
      return NextResponse.json(
        { error: 'Die Seite wurde geladen, aber keine Gerichte erkannt. Nutze alternativ den Foto-Import.', fallback: true },
        { status: 422 }
      )
    }

    // Count totals
    const totalItems = menu.categories.reduce((sum, cat) => sum + (cat.items?.length ?? 0), 0)
    const totalOptions = menu.categories.reduce(
      (sum, cat) => sum + (cat.items ?? []).reduce(
        (s, item) => s + (item.optionGroups ?? []).reduce(
          (os, g) => os + (g.options?.length ?? 0), 0
        ), 0
      ), 0
    )

    const imageUrls = menu.categories.flatMap(cat =>
      (cat.items ?? []).filter(item => item.imageUrl).map(item => item.imageUrl!)
    )

    console.log(`[M29] ✅ Parsed: ${menu.categories.length} categories, ${totalItems} items, ${totalOptions} options, ${imageUrls.length} images`)

    return NextResponse.json({
      success: true,
      platform: platform?.id ?? 'unknown',
      platformName: platform?.name ?? 'Website',
      sourceUrl: url,
      scrapedAt: new Date().toISOString(),
      categories: menu.categories,
      // M30: Profile data from Gemini extraction
      profile: menu.profile ?? null,
      stats: {
        categories: menu.categories.length,
        items: totalItems,
        options: totalOptions,
        images: imageUrls.length,
      },
    })
  } catch (err) {
    console.error('[M29] URL import error:', err)
    return NextResponse.json(
      { error: 'Interner Fehler beim URL-Import.', fallback: true },
      { status: 500 }
    )
  }
}
