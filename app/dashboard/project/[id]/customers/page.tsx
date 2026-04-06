import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { notFound, redirect } from 'next/navigation'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kunden | Bizzn',
}

// Supabase liefert hier ein Join: restaurant_customers + customer_profiles + auth.users email
type CustomerRow = {
  id: string
  user_id: string
  marketing_consent_push: boolean
  marketing_consent_email: boolean
  created_at: string
  customer_profiles: {
    name: string
    phone: string | null
  } | null
}

export default async function CustomersPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Ownership check
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  // 1. Kunden-Verknüpfungen via Admin-Client
  const admin = createAdminClient()
  const { data: rcRows, error: rcError } = await admin
    .from('restaurant_customers')
    .select('id, user_id, marketing_consent_push, marketing_consent_email, created_at')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  if (rcError) {
    console.error('CustomersPage: restaurant_customers query error:', rcError)
  }

  const rows = rcRows ?? []
  const userIds = rows.map((r) => r.user_id)

  // 2. Kundenprofile für diese User-IDs
  const profileMap: Record<string, { name: string; phone: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from('customer_profiles')
      .select('id, name, phone')
      .in('id', userIds)

    if (profileError) {
      console.error('CustomersPage: customer_profiles query error:', profileError)
    }

    for (const p of profiles ?? []) {
      profileMap[p.id] = { name: p.name, phone: p.phone }
    }
  }

  // 3. Zusammenführen
  const typedCustomers: CustomerRow[] = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    marketing_consent_push: r.marketing_consent_push,
    marketing_consent_email: r.marketing_consent_email,
    created_at: r.created_at,
    customer_profiles: profileMap[r.user_id] ?? null,
  }))

  return (
    <div className="min-h-full bg-[#1A1A1A] text-white">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#C7A17A] mb-1">
            Kunden
          </h1>
          <p className="text-gray-400 text-sm">
            Registrierte Kunden von{' '}
            <span className="text-white font-medium">{project.name}</span>
            {project.slug && (
              <> · <span className="text-[#C7A17A] font-mono text-xs">{project.slug}.bizzn.de</span></>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Gesamt', value: typedCustomers.length },
            {
              label: 'Push-Opt-In',
              value: typedCustomers.filter((c) => c.marketing_consent_push).length,
            },
            {
              label: 'E-Mail-Opt-In',
              value: typedCustomers.filter((c) => c.marketing_consent_email).length,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#242424] border border-[#333333] rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-extrabold text-[#C7A17A]">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Kunden-Tabelle */}
        <section className="bg-[#242424] border border-[#333333] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[#333333]">
            <Users className="w-4 h-4 text-[#C7A17A]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Kunden-Liste
            </h2>
          </div>

          {typedCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-gray-400 font-medium">Noch keine Kunden registriert</p>
              <p className="text-gray-600 text-sm mt-1">
                Kunden können sich auf{' '}
                <span className="text-[#C7A17A] font-mono">
                  {project.slug ? `${project.slug}.bizzn.de` : 'deiner Profilseite'}
                </span>{' '}
                ein Konto erstellen.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#333333]">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      Name
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                      Telefon
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                      Push
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                      E-Mail
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                      Registriert
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {typedCustomers.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
                    >
                      <td className="px-6 py-3 font-medium text-white">
                        {c.customer_profiles?.name ?? (
                          <span className="text-gray-600 italic">Unbekannt</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {c.customer_profiles?.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={c.marketing_consent_push ? 'text-green-400' : 'text-gray-700'}>
                          {c.marketing_consent_push ? '✓' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={c.marketing_consent_email ? 'text-green-400' : 'text-gray-700'}>
                          {c.marketing_consent_email ? '✓' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Hinweis Broadcast (coming soon) */}
        <div className="bg-[#1a1a1a] border border-dashed border-[#333333] rounded-xl p-5 text-center">
          <p className="text-xs text-gray-600">
            📣 Broadcast-Funktion (Push/E-Mail an alle Opt-In Kunden) kommt mit{' '}
            <span className="text-[#C7A17A] font-semibold">M18</span>.
          </p>
        </div>

      </div>
    </div>
  )
}
