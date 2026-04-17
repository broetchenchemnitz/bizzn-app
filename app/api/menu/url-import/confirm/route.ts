import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ── Supabase admin client (bypasses RLS) ──────────────────────────────────────
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Types (matching the preview response from /api/menu/url-import) ──────────
interface ImportOption {
  name: string
  priceCents: number
}

interface ImportOptionGroup {
  name: string
  isRequired: boolean
  maxSelect: number
  options: ImportOption[]
}

interface ImportItem {
  name: string
  description?: string
  price: number // decimal euros
  imageUrl?: string
  optionGroups?: ImportOptionGroup[]
  selected?: boolean // true = import this item (default: true)
}

interface ImportCategory {
  name: string
  items: ImportItem[]
  selected?: boolean // true = import this category
}

// ── POST /api/menu/url-import/confirm ─────────────────────────────────────────
// Step 2: Write the previewed data into Supabase (categories, items, option groups, options, images)
export async function POST(req: NextRequest) {
  try {
    const { projectId, categories, sourceUrl } = await req.json() as {
      projectId: string
      categories: ImportCategory[]
      sourceUrl?: string
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID fehlt.' }, { status: 400 })
    }
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'Keine Kategorien zum Importieren.' }, { status: 400 })
    }

    // ── Filter to selected items ──────────────────────────────────────────
    const selectedCategories = categories
      .filter(cat => cat.selected !== false) // default: included
      .map(cat => ({
        ...cat,
        items: (cat.items ?? []).filter(item => item.selected !== false), // default: included
      }))
      .filter(cat => cat.items.length > 0) // remove empty categories

    if (selectedCategories.length === 0) {
      return NextResponse.json({ error: 'Keine Gerichte ausgewählt.' }, { status: 400 })
    }

    // ── Write to DB ───────────────────────────────────────────────────────
    let totalCategoriesCreated = 0
    let totalItemsCreated = 0
    let totalOptionGroupsCreated = 0
    let totalOptionsCreated = 0
    let totalImagesDownloaded = 0

    for (const cat of selectedCategories) {
      if (!cat.name?.trim()) continue

      // Insert category
      const { data: categoryRow, error: catError } = await supabaseAdmin
        .from('menu_categories')
        .insert({ project_id: projectId, name: cat.name.trim() })
        .select('id')
        .single()

      if (catError || !categoryRow) {
        console.error('[M29] Category insert error:', catError)
        continue
      }
      totalCategoriesCreated++

      // Insert items for this category
      for (const item of cat.items) {
        if (!item.name?.trim()) continue

        // Download image if available
        let imageUrl: string | null = null
        if (item.imageUrl) {
          try {
            imageUrl = await downloadAndStoreImage(item.imageUrl, projectId, categoryRow.id)
            if (imageUrl) totalImagesDownloaded++
          } catch (imgErr) {
            console.warn('[M29] Image download failed:', item.imageUrl, imgErr)
            // Continue without image — non-blocking
          }
        }

        const { data: itemRow, error: itemError } = await supabaseAdmin
          .from('menu_items')
          .insert({
            category_id: categoryRow.id,
            name: item.name.trim(),
            description: item.description?.trim() ?? '',
            price: Math.round((item.price ?? 0) * 100), // cents
            is_active: true,
            image_url: imageUrl,
          })
          .select('id')
          .single()

        if (itemError || !itemRow) {
          console.error('[M29] Item insert error:', itemError)
          continue
        }
        totalItemsCreated++

        // Insert option groups + options (M28)
        if (item.optionGroups && item.optionGroups.length > 0) {
          for (let gi = 0; gi < item.optionGroups.length; gi++) {
            const group = item.optionGroups[gi]
            if (!group.name?.trim() || !group.options?.length) continue

            const { data: groupRow, error: groupError } = await supabaseAdmin
              .from('menu_option_groups')
              .insert({
                menu_item_id: itemRow.id,
                name: group.name.trim(),
                is_required: group.isRequired ?? false,
                min_select: group.isRequired ? 1 : 0,
                max_select: group.maxSelect ?? 1,
                sort_order: gi,
              })
              .select('id')
              .single()

            if (groupError || !groupRow) {
              console.error('[M29] Option group insert error:', groupError)
              continue
            }
            totalOptionGroupsCreated++

            // Insert options
            const optionInserts = group.options
              .filter(opt => opt.name?.trim())
              .map((opt, oi) => ({
                option_group_id: groupRow.id,
                name: opt.name.trim(),
                price_cents: Math.max(0, opt.priceCents ?? 0),
                is_default: oi === 0, // First option is default
                sort_order: oi,
              }))

            if (optionInserts.length > 0) {
              const { error: optsError } = await supabaseAdmin
                .from('menu_options')
                .insert(optionInserts)

              if (optsError) {
                console.error('[M29] Options insert error:', optsError)
              } else {
                totalOptionsCreated += optionInserts.length
              }
            }
          }
        }
      }
    }

    console.log(`[M29] Import complete: ${totalCategoriesCreated} categories, ${totalItemsCreated} items, ${totalOptionGroupsCreated} groups, ${totalOptionsCreated} options, ${totalImagesDownloaded} images`)

    return NextResponse.json({
      success: true,
      categoriesCreated: totalCategoriesCreated,
      itemsCreated: totalItemsCreated,
      optionGroupsCreated: totalOptionGroupsCreated,
      optionsCreated: totalOptionsCreated,
      imagesDownloaded: totalImagesDownloaded,
    })
  } catch (err) {
    console.error('[M29] Confirm import error:', err)
    return NextResponse.json({ error: 'Interner Fehler beim Import.' }, { status: 500 })
  }
}

// ── Helper: Download image from external URL and store in Supabase Storage ────
const BUCKET = 'menu-images'
const MAX_IMAGE_SIZE = 3 * 1024 * 1024 // 3MB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

async function downloadAndStoreImage(
  imageUrl: string,
  projectId: string,
  categoryId: string
): Promise<string | null> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Bizzn/1.0)',
        'Accept': 'image/*',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout per image
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    const mainType = contentType.split(';')[0].trim().toLowerCase()

    // Check content type
    if (!ALLOWED_CONTENT_TYPES.some(t => mainType.includes(t.split('/')[1]))) {
      // Try to determine from URL extension
      const ext = imageUrl.split('.').pop()?.split('?')[0]?.toLowerCase()
      if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext)) {
        return null
      }
    }

    const buffer = await response.arrayBuffer()

    // Check size
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      console.warn(`[M29] Image too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB): ${imageUrl}`)
      return null
    }

    // Determine extension
    let ext = 'jpg'
    if (mainType.includes('png')) ext = 'png'
    else if (mainType.includes('webp')) ext = 'webp'
    else if (mainType.includes('avif')) ext = 'avif'

    // Upload to Supabase Storage
    const path = `url-import/${projectId}/${categoryId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mainType || `image/${ext}`,
        upsert: false,
      })

    if (uploadError) {
      console.error('[M29] Storage upload error:', uploadError)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return publicUrl
  } catch (err) {
    console.warn('[M29] Image download error:', err)
    return null
  }
}
