import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

const BUCKET = 'menu-images'
const MAX_SIZE_BYTES = 3 * 1024 * 1024 // 3MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const itemId = formData.get('itemId') as string | null

  if (!file || !itemId) {
    return NextResponse.json({ error: 'Datei und Item-ID erforderlich.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Nur JPG, PNG, WebP oder AVIF erlaubt.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Bild darf maximal 3 MB groß sein.' }, { status: 400 })
  }

  // Verify ownership: item must belong to a project of this user
  const { data: item } = await supabase
    .from('menu_items')
    .select('id, category_id, image_url')
    .eq('id', itemId)
    .single()

  if (!item) return NextResponse.json({ error: 'Speise nicht gefunden.' }, { status: 404 })

  // Delete old image if exists
  if (item.image_url) {
    const oldPath = item.image_url.split(`/${BUCKET}/`)[1]
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
  }

  // Upload new image
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${itemId}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload fehlgeschlagen.' }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  // Save URL to menu_items
  const { error: updateError } = await supabase
    .from('menu_items')
    .update({ image_url: publicUrl })
    .eq('id', itemId)

  if (updateError) {
    return NextResponse.json({ error: 'URL konnte nicht gespeichert werden.' }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'Item-ID erforderlich.' }, { status: 400 })

  const { data: item } = await supabase
    .from('menu_items')
    .select('id, image_url')
    .eq('id', itemId)
    .single()

  if (!item) return NextResponse.json({ error: 'Speise nicht gefunden.' }, { status: 404 })

  if (item.image_url) {
    const path = item.image_url.split(`/${BUCKET}/`)[1]
    if (path) await supabase.storage.from(BUCKET).remove([path])
  }

  await supabase
    .from('menu_items')
    .update({ image_url: null })
    .eq('id', itemId)

  return NextResponse.json({ ok: true })
}
