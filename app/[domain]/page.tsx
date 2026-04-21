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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()
  return (project ?? null) as Record<string, unknown> | null
}

// ─── Kommt-Bald-Seite ───────────────────────────────────────────────────────────
function ComingSoonPage({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-[#0E0E16] flex flex-col items-center justify-center px-4 text-center font-sans">
      <div className="space-y-6 max-w-md">
        <div className="text-6xl animate-pulse">🚀</div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{name}</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Dieses Restaurant bereitet seinen Online-Auftritt vor.<br />
            Bald kannst du hier direkt bestellen — ohne Provision.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8B86D]/10 border border-[#E8B86D]/20 rounded-full text-xs text-[#E8B86D] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8B86D] animate-pulse" />
          Kommt bald auf bizzn.de
        </div>
        <Link href="https://bizzn.de" className="block text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Andere Restaurants entdecken →
        </Link>
      </div>
    </div>
  )
}

// ─── Öffnungsstatus berechnen ────────────────────────────────────────────────────
const DAY_KEYS = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'] // JS: 0=Sunday

function getOpenStatus(hours: Record<string, string>): { isOpen: boolean; todayLabel: string; todayHours: string | null } {
  const now = new Date()
  const dayKey = DAY_KEYS[now.getDay()]
  const todayVal = hours[dayKey]

  const DAYS_DE: Record<string, string> = {
    mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch', do: 'Donnerstag',
    fr: 'Freitag', sa: 'Samstag', so: 'Sonntag'
  }
  const todayLabel = DAYS_DE[dayKey] ?? ''

  if (!todayVal || todayVal.toLowerCase() === 'geschlossen') {
    return { isOpen: false, todayLabel, todayHours: null }
  }

  const match = todayVal.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
  if (!match) return { isOpen: true, todayLabel, todayHours: todayVal }

  const openMinutes = parseInt(match[1]) * 60 + parseInt(match[2])
  const closeMinutes = parseInt(match[3]) * 60 + parseInt(match[4])
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes

  return { isOpen, todayLabel, todayHours: todayVal }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
type ProjectRecord = Record<string, unknown>

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const project = await getProfileData(params.domain)
  const raw = project as Record<string, unknown> | null
  const name = (raw?.name as string) ?? params.domain
  const description = (raw?.description as string) ?? `${name} – direkt bestellen ohne Provision auf bizzn.de`
  const coverImg = raw?.cover_image_url as string | null
  return {
    title: `${name} | bizzn`,
    description,
    openGraph: { title: name, description, images: coverImg ? [coverImg] : [] },
  }
}

const DAYS_DISPLAY = [
  { key: 'mo', label: 'Montag' },
  { key: 'di', label: 'Dienstag' },
  { key: 'mi', label: 'Mittwoch' },
  { key: 'do', label: 'Donnerstag' },
  { key: 'fr', label: 'Freitag' },
  { key: 'sa', label: 'Samstag' },
  { key: 'so', label: 'Sonntag' },
]
const TODAY_KEY = DAY_KEYS[new Date().getDay()]

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default async function RestaurantProfilePage({
  params,
  searchParams,
}: {
  params: { domain: string }
  searchParams: { preview?: string }
}) {
  const project = await getProfileData(params.domain)
  if (!project) notFound()

  // Typisierter Accessor für alle DB-Felder
  const p = project as ProjectRecord
  const status = (p.status as string) ?? 'draft'
  const previewToken = searchParams?.preview ?? null
  const validPreview = previewToken && (p.preview_token as string) === previewToken

  if (status === 'pending_review') return <ComingSoonPage name={p.name as string} />
  const isDraft = status === 'draft'
  if (isDraft && !validPreview) return <ComingSoonPage name={p.name as string} />

  const hours = (p.opening_hours ?? {}) as Record<string, string>
  const hasHours = hours !== null && typeof hours === 'object' && Object.keys(hours).length > 0
  const { isOpen, todayHours } = hasHours ? getOpenStatus(hours) : { isOpen: false, todayHours: null }

  // Typisierte Felder
  const name = p.name as string
  const address = p.address as string | null
  const phone = p.phone as string | null
  const description = p.description as string | null
  const cuisineType = p.cuisine_type as string | null
  const coverImageUrl = p.cover_image_url as string | null
  const projectId = p.id as string

  // Google Maps Link aus Adresse
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null

  return (
    <div className="min-h-screen bg-[#0E0E12] font-sans">

      {/* ── Preview-Banner ──────────────────────────────────────────────────── */}
      {isDraft && validPreview && (
        <div className="sticky top-0 z-50 bg-[#E8B86D] text-black text-xs font-semibold text-center py-2.5 px-4 flex items-center justify-center gap-2">
          <span>👁️ Vorschau-Modus — so sehen deine Gäste das Restaurant nach der Freigabe</span>
        </div>
      )}

      {/* ── Hero Cover ──────────────────────────────────────────────────────── */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={`${name} Cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2a1f10] via-[#1a1410] to-[#0E0E12]" />
        )}
        {/* Gradient overlay — bottom fade into page bg */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/40 to-transparent" />
        {/* Top fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent h-24" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-24 relative z-10 pb-16">

        {/* ── Profile Card ──────────────────────────────────────────────────── */}
        <div className="bg-[#141418] border border-white/8 rounded-2xl shadow-2xl overflow-hidden mb-4">

          {/* Name + Status */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight mb-1.5">
                  {name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {cuisineType && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C7A17A]/12 text-[#C7A17A] border border-[#C7A17A]/25">
                      {cuisineType}
                    </span>
                  )}
                  {hasHours && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      isOpen
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      {isOpen ? `Geöffnet · ${todayHours}` : 'Geschlossen'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-bold text-[#C7A17A] tracking-widest uppercase">bizzn</span>
                <p className="text-[10px] text-gray-500">0% Provision</p>
              </div>
            </div>

            {/* Customer Auth */}
            <CustomerBar projectId={projectId} projectName={name} />
            <PushSubscribeButton projectId={projectId} slug={params.domain} />

            {/* Beschreibung */}
            {description && (
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* ── Kontakt-Leiste ─────────────────────────────────────────────── */}
          {(address || phone) && (
            <div className="border-t border-white/5 px-6 py-4 flex flex-col sm:flex-row gap-3">
              {/* Adresse mit Maps-Link */}
              {address && (
                <a
                  href={mapsUrl ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#C7A17A] transition-colors group flex-1"
                  title="In Google Maps öffnen"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#C7A17A]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                    <svg className="w-4 h-4 text-[#C7A17A]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div>
                    <div className="font-medium text-xs text-gray-300 group-hover:text-[#C7A17A]">
                      {address}
                    </div>
                    {mapsUrl && (
                      <div className="text-[10px] text-gray-600 group-hover:text-[#C7A17A]/70">
                        In Google Maps öffnen →
                      </div>
                    )}
                  </div>
                </a>
              )}

              {/* Telefon */}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#C7A17A] transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#C7A17A]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                    <svg className="w-4 h-4 text-[#C7A17A]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <div>
                    <div className="font-medium text-xs text-gray-300 group-hover:text-[#C7A17A]">{phone}</div>
                    <div className="text-[10px] text-gray-600">Anrufen</div>
                  </div>
                </a>
              )}
            </div>
          )}

          {/* ── CTA Buttons ────────────────────────────────────────────────── */}
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/menu"
              id="cta-speisekarte"
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#C7A17A] to-[#b8906a] hover:from-[#b8906a] hover:to-[#a57d5a] text-black font-bold text-sm py-3.5 px-5 rounded-xl transition-all duration-150 shadow-lg shadow-[#C7A17A]/15 hover:shadow-[#C7A17A]/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Speisekarte & Bestellen
            </Link>
            <a
              href="#tisch-reservieren"
              id="cta-reservieren"
              className="sm:w-auto flex items-center justify-center gap-2 bg-white/4 border border-white/8 text-gray-500 font-semibold text-sm py-3.5 px-4 rounded-xl cursor-not-allowed opacity-50"
              aria-disabled="true"
              title="Demnächst verfügbar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reservieren
              <span className="text-[9px] font-bold bg-[#C7A17A]/15 text-[#C7A17A] px-1.5 py-0.5 rounded-full ml-0.5">bald</span>
            </a>
          </div>
        </div>

        {/* ── Öffnungszeiten ─────────────────────────────────────────────────── */}
        {hasHours && (
          <section className="bg-[#141418] border border-white/8 rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#C7A17A]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              </svg>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Öffnungszeiten</h2>
            </div>
            <div className="px-6 py-4 space-y-1">
              {DAYS_DISPLAY.map(({ key, label }) => {
                const value = hours[key] ?? null
                const isClosed = !value || value.toLowerCase() === 'geschlossen'
                const isToday = key === TODAY_KEY
                return (
                  <div
                    key={key}
                    className={`flex justify-between items-center py-1.5 px-3 rounded-lg text-sm transition-colors ${
                      isToday ? 'bg-[#C7A17A]/8 border border-[#C7A17A]/15' : ''
                    }`}
                  >
                    <span className={`${isToday ? 'text-[#C7A17A] font-semibold' : 'text-gray-500'} w-28`}>
                      {label}{isToday && ' (heute)'}
                    </span>
                    <span className={
                      isClosed
                        ? 'text-gray-600 italic text-xs'
                        : isToday
                          ? 'text-[#C7A17A] font-semibold'
                          : 'text-gray-300 font-medium'
                    }>
                      {isClosed ? 'Geschlossen' : value}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Info-Karten ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { icon: '🚫', label: '0% Provision', sub: 'Kein Aufschlag' },
            { icon: '⚡️', label: 'Direktbestellung', sub: 'Ohne Umweg' },
            { icon: '🔒', label: 'Sicher zahlen', sub: 'SSL-verschlüsselt' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-[#141418] border border-white/8 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-xs font-semibold text-white leading-tight">{label}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="text-center">
          <p className="text-xs text-gray-700">
            Direkt bestellen auf{' '}
            <a href="https://bizzn.de" target="_blank" rel="noreferrer" className="font-semibold text-[#C7A17A] hover:underline">
              bizzn.de
            </a>
            {' '}— 0% Provision, 100% für dein Restaurant.
          </p>
        </div>
      </div>
    </div>
  )
}
