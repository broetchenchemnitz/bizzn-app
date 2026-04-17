import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { FolderGit2, Settings } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/supabase'
import CheckoutButton from '@/components/CheckoutButton'
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard | Bizzn' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Next.js 15: searchParams müssen awaited werden
  const resolvedParams = await searchParams
  const isSuccess = resolvedParams?.success === 'true'
  const isCanceled = resolvedParams?.canceled === 'true'

  // ── Fallback: Projekt erstellen wenn Stripe-Webhook nicht ankam ──────────
  // Wenn User von Stripe zurückkommt (?success=true) aber kein Projekt hat,
  // erstellen wir es direkt. Der Webhook erstellt es normalerweise in Production,
  // aber auf localhost oder bei Webhook-Delays greift dieser Fallback.
  if (isSuccess && user) {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) === 0) {
      console.log('[Dashboard] Fallback: Creating project for user', user.id, '(Stripe webhook may not have fired)')
      const admin = createAdminClient()
      await admin.from('projects').insert({
        user_id: user.id,
        name: `Mein Restaurant`,
        status: 'active',
      })
    }
  }

  const { data: projectsRaw, error } = await supabase
    .from('projects').select('*').order('created_at', { ascending: false })

  const projects = projectsRaw as ProjectRow[] | null


  return (
    <div className="min-h-screen bg-[#1A1A1A] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Notifications */}
        {isSuccess && (
          <div className="p-4 bg-[#2A1E0E] text-[#C7A17A] rounded-xl border border-[#C7A17A]/30 text-sm font-medium">
            ✅ Zahlung erfolgreich! Dein neuer Betrieb wird eingerichtet.
          </div>
        )}
        {isCanceled && (
          <div className="p-4 bg-[#2a1f00] text-amber-400 rounded-xl border border-amber-800 text-sm font-medium">
            ⚠️ Checkout abgebrochen. Du kannst jederzeit erneut starten.
          </div>
        )}

        {/* Header Card */}
        <div className="bg-[#242424] border border-[#333333] rounded-xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">
              Willkommen zurück,{' '}
              {(user?.user_metadata?.full_name as string | undefined) || user?.email || 'User'}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Link
              id="btn-settings-link"
              href="/dashboard/settings"
              className="flex flex-1 md:flex-none justify-center items-center gap-2 bg-[#1A1A1A] border border-[#333333] text-gray-300 hover:text-[#C7A17A] hover:border-[#C7A17A] transition-all px-4 py-2.5 rounded-lg font-medium text-sm"
            >
              <Settings className="w-4 h-4" />
              Einstellungen
            </Link>
            <div className="flex-1 md:flex-none">
              <ManageSubscriptionButton />
            </div>
            <div className="flex-1 md:flex-none">
              <CheckoutButton />
            </div>
          </div>
        </div>

        {/* Projects Card */}
        <div className="bg-[#242424] border border-[#333333] rounded-xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <FolderGit2 className="text-[#C7A17A] w-5 h-5" />
            <h2 className="text-xl font-bold text-white">Meine Betriebe</h2>
          </div>

          {error ? (
            <div className="p-4 bg-red-950 text-red-400 rounded-xl text-sm border border-red-900">
              Fehler beim Laden: {error.message}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-[#333333] rounded-xl">
              <p className="text-gray-500 text-sm">Noch keine Betriebe gefunden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/project/${p.id}`}
                  className="block bg-[#1A1A1A] border border-[#333333] hover:border-[#C7A17A]/50 transition-all rounded-xl p-6 group hover:shadow-[0_0_15px_rgba(199,161,122,0.05)]"
                >
                  <h3 className="font-semibold text-lg text-white mb-6 group-hover:text-[#C7A17A] transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex justify-between items-center text-xs">
                    <span className="bg-[#242424] px-3 py-1 rounded-full border border-[#333333] text-gray-400">
                      {p.status}
                    </span>
                    <span className="text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
