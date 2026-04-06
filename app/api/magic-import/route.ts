import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase admin client (bypasses RLS so we can write on behalf of the user) ──
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Gemini client ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedItem {
  name: string
  description?: string
  price: number // decimal euros e.g. 8.50
}
interface ParsedCategory {
  name: string
  items: ParsedItem[]
}
interface ParsedMenu {
  categories: ParsedCategory[]
}

// ─── POST /api/magic-import ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file) return NextResponse.json({ error: 'Keine Datei übermittelt.' }, { status: 400 })
    if (!projectId) return NextResponse.json({ error: 'Projekt-ID fehlt.' }, { status: 400 })

    // Validate env
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert.' }, { status: 500 })
    }

    // 2. Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'application/pdf'

    // 3. Call Gemini Flash with the file
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Du bist ein Experte für Gastronomie-Digitalisierung.
Analysiere diese Speisekarte und extrahiere alle Kategorien und Gerichte.

WICHTIG: Antworte NUR mit validem JSON ohne Markdown-Codeblöcke oder Erklärungen.

Format:
{
  "categories": [
    {
      "name": "Kategoriename",
      "items": [
        {
          "name": "Gerichtname",
          "description": "Kurze Beschreibung (optional, max 100 Zeichen)",
          "price": 8.50
        }
      ]
    }
  ]
}

Regeln:
- Preise als Dezimalzahl in Euro (z.B. 8.50, nicht "8,50 €")
- Wenn kein Preis erkennbar, setze 0
- Beschreibung leer lassen falls nicht vorhanden
- Kategorienamen auf Deutsch normalisieren (z.B. "Starters" → "Vorspeisen")`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ])

    const rawText = result.response.text().trim()

    // 4. Parse JSON (strip possible markdown fences)
    let menu: ParsedMenu
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      menu = JSON.parse(cleaned)
    } catch {
      console.error('Gemini raw response:', rawText)
      return NextResponse.json(
        { error: 'Gemini-Antwort konnte nicht geparst werden. Bitte manuell überprüfen.' },
        { status: 422 }
      )
    }

    if (!menu.categories || !Array.isArray(menu.categories)) {
      return NextResponse.json({ error: 'Keine Kategorien in der Speisekarte gefunden.' }, { status: 422 })
    }

    // 5. Write to Supabase
    let totalItems = 0

    for (const cat of menu.categories) {
      if (!cat.name?.trim()) continue

      // Insert category
      const { data: categoryRow, error: catError } = await supabaseAdmin
        .from('menu_categories')
        .insert({ project_id: projectId, name: cat.name.trim() })
        .select('id')
        .single()

      if (catError || !categoryRow) {
        console.error('Category insert error:', catError)
        continue
      }

      // Insert items for this category
      const validItems = (cat.items ?? []).filter((i) => i.name?.trim())
      if (validItems.length === 0) continue

      const itemsToInsert = validItems.map((item) => ({
        category_id: categoryRow.id,
        name: item.name.trim(),
        description: item.description?.trim() ?? '',
        // Store price in cents (integer) as per existing schema note
        price: Math.round((item.price ?? 0) * 100),
        is_active: true,
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('menu_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Items insert error:', itemsError)
      } else {
        totalItems += validItems.length
      }
    }

    return NextResponse.json({
      success: true,
      categoriesCreated: menu.categories.length,
      itemsCreated: totalItems,
    })
  } catch (err) {
    console.error('Magic import error:', err)
    return NextResponse.json({ error: 'Interner Fehler beim Import.' }, { status: 500 })
  }
}
