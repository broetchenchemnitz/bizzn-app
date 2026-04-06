import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase admin client (bypasses RLS) ────────────────────────────────────
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
  price: number
}
interface ParsedCategory {
  name: string
  items: ParsedItem[]
}
interface ParsedMenu {
  categories: ParsedCategory[]
}

// ─── POST /api/magic-import/text ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { rawText, projectId } = await req.json()

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Kein Text übermittelt.' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID fehlt.' }, { status: 400 })
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert.' }, { status: 500 })
    }

    // ── Call Gemini Pro (text-only) ───────────────────────────────────────
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Du bist ein Experte für Gastronomie-Digitalisierung.
Analysiere diesen Speisekarten-Text und extrahiere alle Kategorien und Gerichte.

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
- Kategorienamen auf Deutsch normalisieren (z.B. "Starters" → "Vorspeisen")

Speisekarten-Text:
${rawText}`

    const result = await model.generateContent(prompt)
    const rawResponse = result.response.text().trim()

    // ── Parse JSON ────────────────────────────────────────────────────────
    let menu: ParsedMenu
    try {
      const cleaned = rawResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      menu = JSON.parse(cleaned)
    } catch {
      console.error('Gemini raw response (text):', rawResponse)
      return NextResponse.json(
        { error: 'KI-Antwort konnte nicht geparst werden. Bitte Text prüfen.' },
        { status: 422 }
      )
    }

    if (!menu.categories || !Array.isArray(menu.categories)) {
      return NextResponse.json({ error: 'Keine Kategorien im Text gefunden.' }, { status: 422 })
    }

    // ── Write to Supabase ─────────────────────────────────────────────────
    let totalItems = 0

    for (const cat of menu.categories) {
      if (!cat.name?.trim()) continue

      const { data: categoryRow, error: catError } = await supabaseAdmin
        .from('menu_categories')
        .insert({ project_id: projectId, name: cat.name.trim() })
        .select('id')
        .single()

      if (catError || !categoryRow) {
        console.error('Category insert error:', catError)
        continue
      }

      const validItems = (cat.items ?? []).filter((i) => i.name?.trim())
      if (validItems.length === 0) continue

      const itemsToInsert = validItems.map((item) => ({
        category_id: categoryRow.id,
        name: item.name.trim(),
        description: item.description?.trim() ?? '',
        price: Math.round((item.price ?? 0) * 100),
        is_active: true,
      }))

      const { error: itemsError } = await supabaseAdmin.from('menu_items').insert(itemsToInsert)

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
    console.error('Magic import text error:', err)
    return NextResponse.json({ error: 'Interner Fehler beim Import.' }, { status: 500 })
  }
}
