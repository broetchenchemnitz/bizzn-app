import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import ProjectSettingsBlock from '@/components/ProjectSettingsBlock'
import SlugSettingsBlock from '@/components/SlugSettingsBlock'
import RestaurantOverview from '@/components/RestaurantOverview'
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
    /*
     * iOS Safari sticky fix:
     * ─────────────────────
     * Rule: position:sticky requires NO overflow:hidden/auto/scroll on ANY ancestor
     * up to <body>.
     *
     * Ancestor chain (verified clean):
     *   <body no-overflow>
     *     <Navbar sticky top-0 z-50 />         ← global nav (direct body child)
     *     <main no-overflow>
     *       <div#root no-overflow>              ← this element
     *         <header sticky top-[70px] z-40>  ← project breadcrumb (NO overflow above)
     *         <div overflow-x-hidden>           ← grid body SIBLING to header
     */
    <div className="min-h-screen bg-[#1A1A1A]">

      {/* ── Sticky Project Breadcrumb ─────────────────────────────
           IMPORTANT: This element must remain a DIRECT SIBLING of the
           overflow-x-hidden grid wrapper below. Never nest it inside an
           overflow container — iOS Safari silently breaks sticky when any
           ancestor has overflow != visible.
        ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-[70px] z-40 bg-[#242424] border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors gap-1.5 group shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Dashboard
        </Link>
        <span className="text-[#444]">/</span>
        <span className="text-sm font-semibold text-white truncate">{project.name}</span>

        {/* Live badge */}
        <span className="ml-auto flex items-center gap-1.5 bg-[#1a2e00] border border-[#77CC00]/25 text-[#77CC00] text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#77CC00]" />
          </span>
          <span className="hidden sm:inline">Echtzeit aktiv</span>
        </span>

        {/* Gastro-OS badge */}
        <span className="hidden sm:inline text-[10px] font-bold text-[#77CC00] bg-[#1a2e00] px-2.5 py-1 rounded-full border border-[#77CC00]/20 tracking-wide uppercase">
          Gastro-OS v1
        </span>
      </header>

      {/* ── Grid Body — overflow-x-hidden applied HERE ONLY ────────
           The header above is a DOM sibling, not a descendant.
           This is the only element in the ancestor chain with overflow
           set — and it contains NO sticky children.
        ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="grid grid-cols-12 gap-5">

            {/* ── LEFT / MAIN — col-span-8 ──────────────────── */}
            <div className="col-span-12 lg:col-span-8 space-y-5 min-w-0">

              {/* Project header card */}
              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-5">
                <ProjectSettingsBlock projectId={project.id} initialName={project.name} />
              </div>

              {/* KPI + Quick Actions */}
              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-5">
                <RestaurantOverview projectId={project.id} />
              </div>
            </div>

            {/* ── RIGHT / SIDEBAR — col-span-4 ───────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-4 min-w-0">

              {/* Slug inline input */}
              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg px-5 py-4">
                <SlugSettingsBlock projectId={project.id} initialSlug={project.slug ?? null} />
              </div>

              {/* Order Channels */}
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
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#333333] hover:border-[#77CC00]/30 hover:text-white transition-all"
                    >
                      <span className="text-sm text-gray-300">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          {active && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-60" />
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              active ? 'bg-[#77CC00]' : 'bg-gray-700'
                            }`}
                          />
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            active ? 'text-[#77CC00]' : 'text-gray-600'
                          }`}
                        >
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
