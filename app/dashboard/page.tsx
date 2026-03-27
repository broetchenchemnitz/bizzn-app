import { createClient } from '@/lib/supabase-server'
import { FolderGit2, Settings } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/supabase'
import CheckoutButton from '@/components/CheckoutButton'
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard | Bizzn',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projectsRaw, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const projects = projectsRaw as ProjectRow[] | null

  const isSuccess = searchParams?.success === 'true'
  const isCanceled = searchParams?.canceled === 'true'

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {isSuccess && (
          <div className="p-4 bg-[#1a2e00] text-[#77CC00] rounded-xl border border-[#77CC00]/30 text-sm font-medium">
            ✅ Zahlung erfolgreich! Dein neuer Projekt-Workspace wird eingerichtet.
          </div>
        )}
        {isCanceled && (
          <div className="p-4 bg-[#2a1f00] text-amber-400 rounded-xl border border-amber-800 text-sm font-medium">
            ⚠️ Checkout abgebrochen. Du kannst jederzeit erneut starten.
          </div>
        )}

        {/* Header card */}
        <div className="flex justify-between items-center bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-white">Dashboard</h1>
            <p className="text-gray-400 font-medium tracking-wide text-sm mt-1">
              Willkommen zurück, {(user?.user_metadata?.full_name as string | undefined) || user?.email || 'User'}.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] text-gray-300 border border-white/5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
            >
              <Settings className="w-4 h-4 text-gray-500" />
              Einstellungen
            </Link>
            <ManageSubscriptionButton />
            <CheckoutButton />
          </div>
        </div>

        {/* Projects card */}
        <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-6">
          <h2 className="text-base font-extrabold tracking-tighter text-white mb-4 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-[#77CC00]" />
            Aktive Projekte
          </h2>

          {error ? (
            <div className="p-4 bg-red-950 text-red-400 rounded-xl text-sm border border-red-900">
              Fehler beim Laden: {error.message}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#333333] rounded-xl">
              <p className="text-gray-500 mb-4 text-sm">Keine Projekte gefunden. Erstelle dein erstes Projekt.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link
                  href={`/dashboard/project/${project.id}`}
                  key={project.id}
                  className="block p-4 bg-[#1A1A1A] border border-white/5 rounded-2xl hover:border-[#77CC00]/50 hover:shadow-[0_0_20px_rgba(119,204,0,0.15)] transition-all duration-300 cursor-pointer group"
                >
                  <h3 className="font-semibold text-white group-hover:text-[#77CC00] transition-colors">{project.name}</h3>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-[11px] px-2 py-0.5 bg-[#242424] text-gray-400 rounded-full border border-[#333333]">
                      {project.status}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(project.created_at).toLocaleDateString('de-DE')}
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
