import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { UserTableRow } from '@/components/superadmin/UserTableRow'

export const dynamic = 'force-dynamic'

interface Project {
  id: string
  name: string
  status: string
  created_at: string
  slug: string
  user_id: string
}

interface MenuCategory {
  id: string
  name: string
  project_id: string
}

interface OrderCount {
  project_id: string
  count: number
}

export default async function SuperadminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const admin = createAdminClient()

  // ── User laden ─────────────────────────────────────────────────────────────
  const { data: userData, error } = await admin.auth.admin.getUserById(userId)
  if (error || !userData.user) notFound()

  const user = userData.user

  // ── Projekte des Users laden ───────────────────────────────────────────────
  const { data: projectsRaw } = await admin
    .from('projects')
    .select('id, name, status, created_at, slug, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const projects = (projectsRaw ?? []) as Project[]

  // ── Kategorien aller Projekte laden ───────────────────────────────────────
  const projectIds = projects.map(p => p.id)
  const { data: categoriesRaw } = projectIds.length > 0
    ? await admin.from('menu_categories').select('id, name, project_id').in('project_id', projectIds)
    : { data: [] }

  const categories = (categoriesRaw ?? []) as MenuCategory[]

  // ── Bestellungen je Projekt zählen ─────────────────────────────────────────
  const orderCounts: OrderCount[] = []
  for (const project of projects) {
    const { count } = await admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id)
    orderCounts.push({ project_id: project.id, count: count ?? 0 })
  }

  const isSuspended = !!(user as { banned_until?: string | null }).banned_until

  const enrichedUser = {
    id: user.id,
    email: user.email ?? '—',
    created_at: user.created_at,
    last_sign_in_at: (user as { last_sign_in_at?: string | null }).last_sign_in_at ?? null,
    banned_until: (user as { banned_until?: string | null }).banned_until ?? null,
    projects,
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/superadmin" className="hover:text-white transition-colors">← Alle User</Link>
        <span>/</span>
        <span className="text-gray-300">{user.email}</span>
      </div>

      {/* Header */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{user.email}</h1>
            {isSuspended ? (
              <span className="text-xs bg-red-950 border border-red-800 text-red-400 px-2.5 py-1 rounded-full font-semibold">
                ⛔ Gesperrt
              </span>
            ) : (
              <span className="text-xs bg-emerald-950 border border-emerald-800 text-emerald-400 px-2.5 py-1 rounded-full font-semibold">
                ✅ Aktiv
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            User-ID: <code className="text-gray-400 font-mono">{user.id}</code>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Registriert: {new Date(user.created_at).toLocaleString('de-DE')}
            {(user as { last_sign_in_at?: string | null }).last_sign_in_at && (
              <> · Letzter Login: {new Date((user as { last_sign_in_at: string }).last_sign_in_at).toLocaleString('de-DE')}</>
            )}
          </p>
        </div>
      </div>

      {/* Quick-Action row */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Schnellaktionen</p>
        <table className="w-full">
          <tbody>
            <UserTableRow user={enrichedUser} />
          </tbody>
        </table>
      </div>

      {/* Betriebe */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">
          Betriebe ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl py-10 text-center text-gray-600 text-sm">
            Keine Betriebe registriert.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => {
              const catCount = categories.filter(c => c.project_id === project.id).length
              const orderCount = orderCounts.find(o => o.project_id === project.id)?.count ?? 0
              return (
                <div key={project.id} className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{project.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{project.slug}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                      project.status === 'suspended'
                        ? 'bg-red-950 border-red-800 text-red-400'
                        : 'bg-emerald-950 border-emerald-800 text-emerald-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Kategorien', value: catCount },
                      { label: 'Bestellungen', value: orderCount },
                      { label: 'Erstellt', value: new Date(project.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[#0f0f0f] border border-[#222] rounded-lg p-2">
                        <div className="text-sm font-bold text-gray-200 tabular-nums">{value}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
