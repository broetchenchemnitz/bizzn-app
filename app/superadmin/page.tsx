import { createAdminClient } from '@/utils/supabase/admin'
import { UserTableRow } from '@/components/superadmin/UserTableRow'
import { PendingReviewPanel } from '@/components/superadmin/PendingReviewPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Superadmin | Bizzn' }

interface Project {
  id: string
  name: string
  status: string
  created_at: string
  slug: string
  user_id: string
  city: string | null
  address: string | null
  cuisine_type: string | null
  custom_monthly_price_cents?: number | null
  trial_ends_at?: string | null
}

interface RawUser {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null
  banned_until?: string | null
}

export default async function SuperadminPage() {
  const admin = createAdminClient()

  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })

  const { data: projectsRaw } = await admin
    .from('projects')
    .select('id, name, status, created_at, slug, user_id, city, address, cuisine_type, custom_monthly_price_cents, trial_ends_at')
    .order('created_at', { ascending: false })

  const projects = (projectsRaw ?? []) as Project[]
  const users = (usersData?.users ?? []) as RawUser[]
  const userEmailMap = new Map(users.map(u => [u.id, u.email ?? '—']))

  const pendingProjects = projects
    .filter(p => p.status === 'pending_review')
    .map(p => ({
      id: p.id,
      name: p.name,
      city: p.city,
      cuisine_type: p.cuisine_type,
      address: p.address,
      created_at: p.created_at,
      ownerEmail: userEmailMap.get(p.user_id) ?? '—',
    }))

  const enrichedUsers = users
    .filter(u => u.email !== process.env.SUPERADMIN_EMAIL)
    .map(u => ({
      id: u.id,
      email: u.email ?? '—',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned_until: u.banned_until ?? null,
      projects: projects.filter(p => p.user_id === u.id),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalProjects = projects.length
  const suspendedUsers = enrichedUsers.filter(u => u.banned_until).length
  const activeUsers = enrichedUsers.length - suspendedUsers
  const pendingCount = pendingProjects.length

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Superadmin
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-500 text-black text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Vollzugriff auf Betriebe, Nutzer und Freigaben.</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <PendingReviewPanel projects={pendingProjects} />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Registrierte User', value: enrichedUsers.length, color: 'text-white' },
          { label: 'Aktive User', value: activeUsers, color: 'text-emerald-400' },
          { label: 'Ausstehend', value: pendingCount, color: pendingCount > 0 ? 'text-amber-400' : 'text-gray-600' },
          { label: 'Betriebe gesamt', value: totalProjects, color: 'text-indigo-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#161616] border border-[#222] rounded-xl p-5 shadow">
            <div className={`text-3xl font-bold ${color} tabular-nums`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {usersError && (
        <div className="p-4 bg-red-950 border border-red-800 text-red-400 rounded-xl text-sm">
          Fehler beim Laden der User: {usersError.message}
        </div>
      )}

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">
            Alle Nutzer ({enrichedUsers.length})
          </h2>
        </div>
        {enrichedUsers.length === 0 ? (
          <div className="py-16 text-center text-gray-600 text-sm">Noch keine registrierten User außer dir.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-xs text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">E-Mail / Betriebe</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Registriert</th>
                  <th className="px-4 py-3 text-left font-medium">Letzter Login</th>
                  <th className="px-4 py-3 text-center font-medium"># Betriebe</th>
                  <th className="px-4 py-3 text-left font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {enrichedUsers.map(user => (
                  <UserTableRow key={user.id} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
