import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { FolderGit2, Settings, PlusCircle, Wand2 } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/supabase'
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

  const resolvedParams = await searchParams
  const isSuccess = resolvedParams?.success === 'true'
  const isCanceled = resolvedParams?.canceled === 'true'
  const isWizardSuccess = resolvedParams?.wizard_success === 'true'

  // ── Fallback: Projekt-Status auf active setzen wenn Stripe-Webhook nicht ankam ──
  const wizardProjectId = resolvedParams?.project as string | undefined
  if ((isSuccess || isWizardSuccess) && user && wizardProjectId) {
    await supabase
      .from('projects')
      .update({ status: 'active', live_since: new Date().toISOString() })
      .eq('id', wizardProjectId)
      .eq('user_id', user.id)
      .eq('status', 'draft') // Idempotenz: nur wenn noch draft
  } else if (isSuccess && user) {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) === 0) {
      console.log('[Dashboard] Fallback: Creating project for user', user.id)
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
        {(isSuccess || isWizardSuccess) && (
          <div className="p-4 bg-[#1a2e1a] text-emerald-400 rounded-xl border border-emerald-800/40 text-sm font-medium flex items-center gap-3">
            🎉 <span>Herzlichen Glückwunsch! Dein Restaurant ist jetzt live auf bizzn.de.</span>
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
            {/* Neues Restaurant → Wizard */}
            <Link
              id="btn-new-project"
              href="/onboarding"
              className="flex flex-1 md:flex-none justify-center items-center gap-2 bg-[#C7A17A] hover:bg-[#b8906a] text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Neues Restaurant
            </Link>
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
            <div className="text-center py-12 border-2 border-dashed border-[#333333] rounded-xl space-y-4">
              <div className="text-4xl">🏪</div>
              <p className="text-gray-400 text-sm font-medium">Noch kein Restaurant angelegt.</p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-[#C7A17A] hover:bg-[#b8906a] text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
              >
                <Wand2 className="w-4 h-4" />
                Jetzt einrichten
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => {
                const isDraft = p.status === 'draft'
                return (
                  <div
                    key={p.id}
                    className="bg-[#1A1A1A] border border-[#333333] hover:border-[#C7A17A]/30 transition-all rounded-xl p-6 group"
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isDraft
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDraft ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                        {isDraft ? 'Entwurf' : 'Live'}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {new Date(p.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>

                    <Link href={`/dashboard/project/${p.id}`}>
                      <h3 className="font-semibold text-lg text-white mb-4 group-hover:text-[#C7A17A] transition-colors">
                        {p.name}
                      </h3>
                    </Link>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/project/${p.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[#333333] hover:border-[#444] px-3 py-2 rounded-lg transition-all"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Verwalten
                      </Link>
                      <Link
                        href={`/onboarding?project=${p.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#C7A17A] hover:text-white border border-[#C7A17A]/20 hover:border-[#C7A17A]/50 px-3 py-2 rounded-lg transition-all"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        {isDraft ? 'Setup fortsetzen' : 'Wizard neu starten'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
