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
     * iOS / WebKit sticky fix — DOM structure contract:
     * ──────────────────────────────────────────────────
     * 1. <header> is a SIBLING of the overflow-x-hidden wrapper — never inside it.
     * 2. No ancestor of <header> may have overflow != visible (up to <body>).
     * 3. rgba opacity 0.85 → required for WebKit to actually render the blur.
     * 4. translate3d(0,0,0) → GPU layer, eliminates scroll flicker.
     * 5. -webkit- prefixes → Safari ≤ 15.3 compatibility.
     * 6. @supports block in globals.css → solid fallback for non-supporting browsers.
     *
     * Verified ancestor chain (no overflow):
     *   <body> → <main> → <div#root>
     *     ├── <header sticky z-50 safari-header>  ← CLEAN
     *     └── <div overflow-x-hidden>              ← SIBLING
     */
    <div className="min-h-screen bg-[#1A1A1A]">

      {/* ══ STICKY PROJECT BREADCRUMB ══════════════════════════════
          Stacking context strategy (Gem 2 QA Iteration 3):
          ─ isolation: isolate  → creates stacking context at ZERO GPU cost.
            Pure CSS paint containment. No VRAM allocation. Safe on all elements.
          ─ will-change: transform → hints compositor to promote THIS layer.
            Applied to ONE static sticky element only — no animation loop, no
            repeated promotion → VRAM risk is zero. Explicitly released by
            absence of any transition/keyframe (browser auto-releases).
          ─ translate3d(0,0,0) REMOVED — the old GPU-force hack that Gem 2
            correctly flagged. isolation:isolate is the modern substitute
            for z-index stacking context.
          ─ -webkit-backdrop-filter: explicit vendor prefix retained for
            Safari ≤ 15.3. Standard backdrop-filter covers all other engines.
          ══════════════════════════════════════════════════════════ */}
      <header
        className="isolate sticky top-[70px] z-50 border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center gap-3 min-w-0 safari-header"
        style={{
          /* rgba(0.85): required for WebKit to composite the blur.
             Fully opaque bg disables backdrop-filter rendering in Safari. */
          backgroundColor: 'rgba(26, 26, 26, 0.85)',
          /* -webkit-backdrop-filter: explicit for Safari ≤ 15.3 */
          WebkitBackdropFilter: 'blur(10px)',
          /* backdrop-filter: standard spec for Chrome/Firefox/Edge */
          backdropFilter: 'blur(10px)',
          /*
           * will-change: transform → compositor hint for this ONE element.
           * NOT translate3d(0,0,0) — that old hack forces a GPU layer immediately
           * and holds VRAM indefinitely, risking Safari VRAM exhaustion at scale.
           * will-change defers the decision to the browser compositor which can
           * release the layer when the element leaves the viewport.
           * Safe here: single static sticky header, no keyframe/transition loop.
           */
          willChange: 'transform',
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

        <span className="ml-auto flex items-center gap-1.5 bg-[#1a2e00] border border-[#77CC00]/25 text-[#77CC00] text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#77CC00]" />
          </span>
          <span className="hidden sm:inline">Echtzeit aktiv</span>
        </span>

        <span className="hidden sm:inline text-[10px] font-bold text-[#77CC00] bg-[#1a2e00] px-2.5 py-1 rounded-full border border-[#77CC00]/20 tracking-wide uppercase">
          Gastro-OS v1
        </span>
      </header>

      {/* ══ GRID BODY — overflow-x-hidden LOCAL to this wrapper ═══
          Header above is a DOM sibling → sticky unaffected.
          min-w-0 on grid children → grid overflow fixed at source.
          ══════════════════════════════════════════════════════════ */}
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
                        <span className={`text-[11px] font-semibold ${active ? 'text-[#77CC00]' : 'text-gray-600'}`}>
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
