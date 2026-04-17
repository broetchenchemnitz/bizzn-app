import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Metadata } from 'next'
import Link from 'next/link'
import CustomerBar from '@/components/storefront/CustomerBar'
import PushSubscribeButton from '@/components/storefront/PushSubscribeButton'

export const dynamic = 'force-dynamic'

type ProjectRow = Database['public']['Tables']['projects']['Row']

function createAnonSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getProfileData(slug: string) {
  const supabase = createAnonSupabase()
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single<ProjectRow>()
  return project ?? null
}

export async function generateMetadata({
  params,
}: {
  params: { domain: string }
}): Promise<Metadata> {
  const project = await getProfileData(params.domain)
  const name = project?.name ?? params.domain
  const description = project?.description
    ?? `Entdecke ${name} – direkt bestellen ohne Provision, ohne Lieferando.`
  return {
    title: `${name} | bizzn`,
    description,
  }
}

// ─── Öffnungszeiten-Hilfsfunktion ────────────────────────────────────────────
const DAYS: { key: string; label: string }[] = [
  { key: 'mo', label: 'Montag' },
  { key: 'di', label: 'Dienstag' },
  { key: 'mi', label: 'Mittwoch' },
  { key: 'do', label: 'Donnerstag' },
  { key: 'fr', label: 'Freitag' },
  { key: 'sa', label: 'Samstag' },
  { key: 'so', label: 'Sonntag' },
]

export default async function RestaurantProfilePage({
  params,
}: {
  params: { domain: string }
}) {
  const project = await getProfileData(params.domain)

  if (!project) {
    notFound()
  }

  const hours = (project.opening_hours ?? {}) as Record<string, string>
  const hasHours = Object.keys(hours).length > 0

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-sans">
      {/* ── Hero / Cover ─────────────────────────────────────────────────────── */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-gradient-to-br from-[#2a2118] to-[#1a1a1a]">
        {project.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover_image_url}
            alt={`${project.name} Cover`}
            className="w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl opacity-20 select-none">🍽️</div>
          </div>
        )}
        {/* Gradient-Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>

      {/* ── Profil-Card ──────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4">
        {/* Name & Cuisine Badge — überlappt das Cover */}
        <div className="-mt-10 mb-6 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8E4DF]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-1 truncate">
                  {project.name}
                </h1>
                {project.cuisine_type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C7A17A]/15 text-[#8a6542] border border-[#C7A17A]/30">
                    {project.cuisine_type}
                  </span>
                )}
              </div>
              {/* Bizzn-Badge */}
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-bold text-[#C7A17A] tracking-widest uppercase">
                  bizzn
                </span>
                <p className="text-[10px] text-gray-400">0% Provision</p>
              </div>
            </div>

            {/* M15: Kunden-Auth Bar */}
            <CustomerBar
              projectId={project.id}
              projectName={project.name}
            />

            {/* M18: Push-Opt-in */}
            <PushSubscribeButton
              projectId={project.id}
              slug={params.domain}
            />

            {/* Beschreibung */}
            {project.description && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                {project.description}
              </p>
            )}

            {/* Kontakt-Infos */}
            {(project.address || project.phone) && (
              <div className="mt-4 space-y-1.5">
                {project.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 mt-0.5 text-[#C7A17A] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{project.address}</span>
                  </div>
                )}
                {project.phone && (
                  <a
                    href={`tel:${project.phone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#C7A17A] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#C7A17A] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{project.phone}</span>
                  </a>
                )}
              </div>
            )}

            {/* CTA-Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${params.domain}/menu`}
                id="cta-speisekarte"
                className="flex-1 flex items-center justify-center gap-2 bg-[#C7A17A] hover:bg-[#b8906a] text-white font-bold text-sm py-3 px-5 rounded-xl transition-all duration-150 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Speisekarte ansehen &amp; bestellen
              </Link>
              <a
                href="#tisch-reservieren"
                id="cta-reservieren"
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E8E4DF] text-gray-500 font-semibold text-sm py-3 px-5 rounded-xl transition-all duration-150 cursor-not-allowed opacity-60"
                aria-disabled="true"
                title="Demnächst verfügbar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Tisch reservieren
                <span className="text-[10px] font-bold bg-[#C7A17A]/15 text-[#8a6542] px-1.5 py-0.5 rounded-full ml-1">bald</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Öffnungszeiten ────────────────────────────────────────────────── */}
        {hasHours && (
          <section className="mb-6 bg-white rounded-2xl border border-[#E8E4DF] shadow-sm p-6">
            <h2 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#C7A17A]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              </svg>
              Öffnungszeiten
            </h2>
            <div className="space-y-1.5">
              {DAYS.map(({ key, label }) => {
                const value = hours[key]
                if (!value) return null
                const isClosed = value.toLowerCase() === 'geschlossen'
                return (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 w-28">{label}</span>
                    <span className={isClosed ? 'text-gray-400 italic' : 'text-[#1A1A1A] font-medium'}>
                      {value}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Powered by Bizzn ─────────────────────────────────────────────── */}
        <div className="pb-10 text-center">
          <p className="text-xs text-gray-400">
            Direkt bestellen auf{' '}
            <a
              href="https://bizzn.de"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#C7A17A] hover:underline"
            >
              bizzn.de
            </a>
            {' '}— 0% Provision, 100% für dein Restaurant.
          </p>
        </div>
      </div>
    </div>
  )
}
