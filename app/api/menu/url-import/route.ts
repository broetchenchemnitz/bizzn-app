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
}

interface ParsedCategory {
  name: string
  items: ParsedItem[]
}

interface ParsedMenu {
  categories: ParsedCategory[]
}

// ── Platform detection ────────────────────────────────────────────────────────
const KNOWN_PLATFORMS = [
  { id: 'lieferando', pattern: /lieferando\.de/i, name: 'Lieferando' },
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

// ── Helper: extract category sub-page links from Wolt markdown ───────────────
function extractWoltCategoryLinks(markdown: string, baseUrl: string): { name: string; url: string }[] {
  const links: { name: string; url: string }[] = []
  // Wolt pattern: [CATEGORY NAME 🍗🍔](/de/deu/city/restaurant/slug/items/category-slug)
  const regex = /\[(?:!\[.*?\]\(.*?\)\s*)?([^\]]+)\]\((\/(de|en)\/\w+\/\w+\/restaurant\/[^/]+\/items\/[^\)]+)\)/g
  let match
  while ((match = regex.exec(markdown)) !== null) {
    const name = match[1].replace(/[🍗🍔🧀🌱🥪🍛🔥🌟💧🥤🍰📦]/g, '').trim()
    const path = match[2]
    // Build full URL from path
    const origin = new URL(baseUrl).origin
    links.push({ name, url: `${origin}${path}` })
  }
  return links
}

// ── Helper: extract category sub-page links from Lieferando markdown ─────────
function extractLieferandoCategoryLinks(markdown: string, originalUrl: string): string[] {
  // Lieferando usually loads everything on one page, but if we detect category anchors, return them
  return [] // Lieferando loads all items on main page
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

    if (!process.env.BROWSERLESS_API_TOKEN || process.env.BROWSERLESS_API_TOKEN === 'YOUR_BROWSERLESS_TOKEN_HERE') {
      return NextResponse.json({ error: 'Browserless.io ist noch nicht konfiguriert. Bitte BROWSERLESS_API_TOKEN in .env.local setzen.' }, { status: 500 })
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert.' }, { status: 500 })
    }

    const platform = detectPlatform(url)
    const browserlessBase = process.env.BROWSERLESS_BASE_URL || 'https://production-ams.browserless.io'
    const token = process.env.BROWSERLESS_API_TOKEN

    // ── Step 1: Scrape main page ──────────────────────────────────────────
    console.log(`[M29] Scraping URL: ${url} (platform: ${platform?.id ?? 'unknown'})`)

    const mainScrape = await scrapeUrl(url, browserlessBase, token)

    if (!mainScrape.ok) {
      console.error('[M29] Main page scrape failed:', mainScrape.error)
      return NextResponse.json(
        { error: 'Seite konnte nicht geladen werden. Bitte prüfe die URL oder nutze den Foto-Import als Alternative.', fallback: true },
        { status: 422 }
      )
    }

    let combinedMarkdown = mainScrape.markdown ?? ''
    const screenshot = mainScrape.screenshot ?? null

    console.log(`[M29] Main scrape OK — Strategy: ${mainScrape.strategy}, Markdown: ${combinedMarkdown.length} chars, Screenshot: ${screenshot ? 'yes' : 'no'}`)

    // ── Step 1b: Multi-page scraping for platforms with lazy-loaded items ──
    if (platform?.id === 'wolt' && combinedMarkdown) {
      const categoryLinks = extractWoltCategoryLinks(combinedMarkdown, url)
      
      if (categoryLinks.length > 0) {
        console.log(`[M29] Wolt: Found ${categoryLinks.length} category sub-pages, scraping each...`)
        
        // Scrape category pages in parallel (max 3 at a time to be nice)
        const BATCH_SIZE = 3
        for (let i = 0; i < categoryLinks.length; i += BATCH_SIZE) {
          const batch = categoryLinks.slice(i, i + BATCH_SIZE)
          const results = await Promise.all(
            batch.map(async (link) => {
              console.log(`[M29] Wolt sub-scrape: ${link.name} → ${link.url}`)
              const result = await scrapeUrl(link.url, browserlessBase, token, ['markdown'])
              return { name: link.name, result }
            })
          )

          for (const { name, result } of results) {
            if (result.ok && result.markdown) {
              combinedMarkdown += `\n\n--- KATEGORIE: ${name} ---\n\n${result.markdown}`
              console.log(`[M29] Wolt sub-scrape OK: ${name} (${result.markdown.length} chars)`)
            } else {
              console.warn(`[M29] Wolt sub-scrape FAILED: ${name} — ${result.error}`)
            }
          }
        }

        console.log(`[M29] Wolt total markdown after sub-scrapes: ${combinedMarkdown.length} chars`)
      }
    }

    if (!combinedMarkdown && !screenshot) {
      return NextResponse.json(
        { error: 'Keine Inhalte auf der Seite gefunden. Ist die URL korrekt?', fallback: true },
        { status: 422 }
      )
    }

    // ── Step 2: Gemini AI Parsing ────────────────────────────────────────

    const platformHint = platform
      ? `Die Quelle ist ${platform.name} (${url}).`
      : `Die Quelle ist eine Restaurant-Website (${url}).`

    const prompt = `Du bist ein Experte für Gastronomie-Digitalisierung.
Du erhältst den Inhalt einer Online-Speisekarte (Markdown-Text, evtl. aus mehreren Unterseiten zusammengesetzt).
${platformHint}

Extrahiere ALLE Gerichte mit Kategorien, Preisen, Beschreibungen und Optionen / Extras.

WICHTIG: Antworte NUR mit validem JSON ohne Markdown-Codeblöcke oder Erklärungen.

JSON-Format:
{
  "categories": [
    {
      "name": "Kategoriename",
      "items": [
        {
          "name": "Gerichtname",
          "description": "Beschreibung (max 150 Zeichen, leer wenn nicht vorhanden)",
          "price": 8.50,
          "imageUrl": "https://... (nur wenn vollständige Bild-URL im Text erkennbar, sonst weglassen)",
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

Regeln:
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
