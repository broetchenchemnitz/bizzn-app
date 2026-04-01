import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import ProjectSettingsBlock from '@/components/ProjectSettingsBlock'
import SlugSettingsBlock from '@/components/SlugSettingsBlock'
import RestaurantOverview from '@/components/RestaurantOverview'
import StickyHeader from '@/components/StickyHeader'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const metadata = {
  title: 'Restaurant Dashboard | Bizzn',
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) notFound()

  return (
    <div className="min-h-screen bg-[#1A1A1A]">

      {/*
        StickyHeader — Client Component
        ─────────────────────────────────────
        Implements iOS Safari hotfixes:
        1. isolate class → CSS stacking context, zero GPU cost
        2. safari-header class → @supports CSS hooks (globals.css)
        3. rgba(0.85) bg → required for WebKit backdrop-filter compositing
        4. Explicit -webkit-backdrop-filter for Safari ≤ 15.3
        5. JS: will-change lifecycle + transitionend bubbling guard
           + double-rAF VRAM flush (inside StickyHeader component)
      */}
      <StickyHeader
        className="isolate sticky top-[70px] z-50 border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center gap-3 min-w-0 safari-header"
        style={{
          backgroundColor: 'rgba(26, 26, 26, 0.85)',
          WebkitBackdropFilter: 'blur(10px)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors gap-1.5 group shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Dashboard
        </Link>
        <span className="text-[#444]">/</span>
        <span className="text-sm font-semibold text-white truncate">{project.name}</span>

        <span className="ml-auto flex items-center gap-1.5 bg-[#2A1E0E] border border-[#C7A17A]/25 text-[#C7A17A] text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7A17A] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C7A17A]" />
          </span>
          <span className="hidden sm:inline">Echtzeit aktiv</span>
        </span>

        <span className="hidden sm:inline text-[10px] font-bold text-[#C7A17A] bg-[#2A1E0E] px-2.5 py-1 rounded-full border border-[#C7A17A]/20 tracking-wide uppercase">
          Gastro-OS v1
        </span>
      </StickyHeader>

      {/* Grid Body — overflow-x-hidden LOCAL, header is a DOM sibling */}
      <div className="overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-8">
          <div className="grid grid-cols-12 gap-5">

            {/* LEFT / MAIN — col-span-8 */}
            <div className="col-span-12 lg:col-span-8 space-y-5 min-w-0">

              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-5">
                <ProjectSettingsBlock projectId={project.id} initialName={project.name} />
              </div>

              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-5">
                <RestaurantOverview projectId={project.id} />
              </div>
            </div>

            {/* RIGHT / SIDEBAR — col-span-4 */}
            <div className="col-span-12 lg:col-span-4 space-y-4 min-w-0">

              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg px-5 py-4">
                <SlugSettingsBlock projectId={project.id} initialSlug={project.slug ?? null} />
              </div>

              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-5">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">
                  Bestellkanäle
                </p>
                <div className="space-y-2">
                  {[
                    { label: '🛵 Lieferung', active: true },
                    { label: '🛍️ Abholung (Takeaway)', active: true },
                    { label: '📱 In-Store / QR-Code', active: false },
                  ].map(({ label, active }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#333333] hover:border-[#C7A17A]/30 hover:text-white transition-all"
                    >
                      <span className="text-sm text-gray-300">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          {active && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7A17A] opacity-60" />
                          )}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-[#C7A17A]' : 'bg-gray-700'}`} />
                        </span>
                        <span className={`text-[11px] font-semibold ${active ? 'text-[#C7A17A]' : 'text-gray-600'}`}>
                          {active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
