import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function GET() {
  // Admin-Auth prüfen
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Pending-Review Projekte mit allen Feldern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectsRaw, error } = await (admin as any)
    .from('projects')
    .select('id, name, slug, description, address, phone, cuisine_type, cover_image_url, opening_hours, city, postal_code, created_at, user_id, superadmin_note')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })

  if (error || !projectsRaw) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects: any[] = projectsRaw

  // Owner-E-Mails aus auth
  const { data: { users } } = await admin.auth.admin.listUsers()
  const emailMap = new Map(users.map(u => [u.id, u.email ?? null]))

  // Owner-Namen aus customer_profiles (falls Gastronom auch Kunde hat)
  const ownerIds = projects.map(p => p.user_id)
  const { data: profiles } = await admin
    .from('customer_profiles')
    .select('id, name')
    .in('id', ownerIds)
  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.name]))

  // Menü-Einträge pro Restaurant zählen
  const projectIds = projects.map(p => p.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: menuItems } = await (admin as any)
    .from('menu_items')
    .select('project_id')
    .in('project_id', projectIds)
  const menuCountMap = new Map<string, number>()
  for (const item of menuItems ?? []) {
    menuCountMap.set(item.project_id, (menuCountMap.get(item.project_id) ?? 0) + 1)
  }

  const result = projects.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    address: p.address,
    phone: p.phone,
    cuisine_type: p.cuisine_type,
    cover_image_url: p.cover_image_url,
    opening_hours: p.opening_hours,
    city: p.city,
    postal_code: p.postal_code,
    created_at: p.created_at,
    superadmin_note: p.superadmin_note,
    ownerEmail: emailMap.get(p.user_id) ?? null,
    ownerName: nameMap.get(p.user_id) ?? null,
    menuItemCount: menuCountMap.get(p.id) ?? 0,
  }))

  return NextResponse.json(result)
}
