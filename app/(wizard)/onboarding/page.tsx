'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, ChevronRight, ChevronLeft, Loader2, AlertCircle, Eye, Zap, Globe, ShoppingBag, Truck, Coffee, Tag, Image as ImageIcon } from 'lucide-react'
import {
  createDraftProject,
  saveOnboardingStep,
  saveOnboardingProfile,
  saveOnboardingSlug,
  saveOnboardingChannels,
  saveOnboardingDiscovery,
  saveOnboardingDiscount,
  goLive,
  loadWizardProject,
  checkSlugAvailability,
} from '@/app/actions/onboarding'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardProject {
  id: string
  name: string
  slug: string | null
  description: string | null
  address: string | null
  phone: string | null
  cuisine_type: string | null
  cover_image_url: string | null
  opening_hours: Record<string, string> | null
  pickup_enabled: boolean | null
  delivery_enabled: boolean | null
  in_store_enabled: boolean | null
  delivery_fee_cents: number | null
  min_order_cents: number | null
  free_delivery_above_cents: number | null
  city: string | null
  postal_code: string | null
  is_public: boolean | null
  welcome_discount_enabled: boolean | null
  welcome_discount_pct: number | null
  status: string
  onboarding_step: number
  preview_token: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const STEPS = [
  { id: 1, label: 'Name', icon: '🏪' },
  { id: 2, label: 'Import', icon: '✨' },
  { id: 3, label: 'Profil', icon: '📝' },
  { id: 4, label: 'Web-Adresse', icon: '🔗' },
  { id: 5, label: 'Kanäle', icon: '📦' },
  { id: 6, label: 'Rabatt', icon: '🎁' },
  { id: 7, label: 'Vorschau', icon: '👁️' },
  { id: 8, label: 'Live!', icon: '🚀' },
]

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const projectIdParam = searchParams.get('project')
  const stepParam = parseInt(searchParams.get('step') ?? '1', 10)

  const [currentStep, setCurrentStep] = useState(Math.max(1, Math.min(stepParam, 9)))
  const [project, setProject] = useState<WizardProject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!projectIdParam)

  // Load existing project if projectId given
  useEffect(() => {
    if (!projectIdParam) { setLoading(false); return }
    loadWizardProject(projectIdParam).then((data) => {
      if (data) {
        setProject(data as WizardProject)
        // Resume at saved step if not already set via URL
        if (!searchParams.get('step') && data.onboarding_step > 0) {
          setCurrentStep(Math.min(data.onboarding_step + 1, 9))
        }
      }
      setLoading(false)
    })
  }, [projectIdParam, searchParams])

  const updateUrlStep = useCallback((step: number, pid: string) => {
    const params = new URLSearchParams({ project: pid, step: String(step) })
    router.replace(`/onboarding?${params.toString()}`, { scroll: false })
  }, [router])

  const handleProjectCreated = (pid: string) => {
    updateUrlStep(2, pid)
    setCurrentStep(2)
  }

  const handleNext = (updatedProject?: Partial<WizardProject>) => {
    if (updatedProject && project) {
      setProject({ ...project, ...updatedProject })
    }
    const next = currentStep + 1
    if (project?.id) updateUrlStep(next, project.id)
    setCurrentStep(next)
  }

  const handleBack = () => {
    const prev = currentStep - 1
    if (project?.id) updateUrlStep(prev, project.id)
    setCurrentStep(prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8B86D]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Progress Bar ────────────────────────────────────────────────── */}
      <ProgressBar currentStep={currentStep} />

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-950/50 border border-red-800/50 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Step Content ────────────────────────────────────────────────── */}
      <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl overflow-hidden shadow-2xl">
        {currentStep === 1 && (
          <Step1Name
            initialName={project?.name ?? ''}
            onCreated={(pid, proj) => {
              setProject(proj)
              handleProjectCreated(pid)
            }}
            isPending={isPending}
            startTransition={startTransition}
            setError={setError}
          />
        )}
        {currentStep === 2 && project && (
          <Step2Import
            project={project}
            onNext={(p) => handleNext(p)}
            onBack={handleBack}
          />
        )}
        {currentStep === 3 && project && (
          <Step3Profile
            project={project}
            onNext={(p) => handleNext(p)}
            onBack={handleBack}
            isPending={isPending}
            startTransition={startTransition}
            setError={setError}
          />
        )}
        {currentStep === 4 && project && (
          <Step4Slug
            project={project}
            onNext={(p) => handleNext(p)}
            onBack={handleBack}
            isPending={isPending}
            startTransition={startTransition}
            setError={setError}
          />
        )}
        {currentStep === 5 && project && (
          <Step5Channels
            project={project}
            onNext={(p) => handleNext(p)}
            onBack={handleBack}
            isPending={isPending}
            startTransition={startTransition}
            setError={setError}
          />
        )}
        {currentStep === 6 && project && (
          <Step7Discount
            project={project}
            onNext={(p) => handleNext(p)}
            onBack={handleBack}
            isPending={isPending}
            startTransition={startTransition}
            setError={setError}
          />
        )}
        {currentStep === 7 && project && (
          <Step8Preview
            project={project}
            onNext={() => handleNext()}
            onBack={handleBack}
          />
        )}
        {currentStep === 8 && project && (
          <Step9Live
            project={project}
            onBack={handleBack}
            isPending={isPending}
            startTransition={startTransition}
            setError={setError}
          />
        )}
      </div>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Schritt {currentStep} von {STEPS.length}</span>
        <span>{STEPS[currentStep - 1]?.label}</span>
      </div>
      <div className="flex gap-1">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              s.id < currentStep
                ? 'bg-[#E8B86D]'
                : s.id === currentStep
                ? 'bg-[#E8B86D]/60'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      {/* Step dots for desktop */}
      <div className="hidden sm:flex justify-between mt-1">
        {STEPS.map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-1">
            <span className={`text-base ${s.id <= currentStep ? 'opacity-100' : 'opacity-25'}`}>
              {s.id < currentStep ? '✓' : s.icon}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

function StepHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="px-8 pt-8 pb-6 border-b border-white/5">
      <div className="text-3xl mb-3">{icon}</div>
      <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
      {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
    </div>
  )
}

function StepFooter({
  onBack,
  onNext,
  onNextLabel = 'Weiter',
  onSkip,
  isPending,
  disableNext,
}: {
  onBack?: () => void
  onNext?: () => void
  onNextLabel?: string
  onSkip?: () => void
  isPending?: boolean
  disableNext?: boolean
}) {
  return (
    <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between gap-4">
      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </button>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-3 py-2 rounded-lg"
          >
            Überspringen
          </button>
        )}
      </div>
      {onNext && (
        <button
          onClick={onNext}
          disabled={isPending || disableNext}
          className="flex items-center gap-2 bg-[#E8B86D] hover:bg-[#d4a55a] text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {onNextLabel}
          {!isPending && <ChevronRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}

// ─── Step 1: Restaurant Name ──────────────────────────────────────────────────

function Step1Name({
  initialName,
  onCreated,
  isPending,
  startTransition,
  setError,
}: {
  initialName: string
  onCreated: (id: string, project: WizardProject) => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  setError: (e: string | null) => void
}) {
  const [name, setName] = useState(initialName)

  const handleSubmit = () => {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createDraftProject(name.trim())
      if ('error' in result) { setError(result.error); return }
      const proj = await loadWizardProject(result.id)
      onCreated(result.id, proj as WizardProject)
    })
  }

  return (
    <>
      <StepHeader icon="🏪" title="Wie heißt dein Restaurant?" subtitle="Du kannst den Namen jederzeit später ändern." />
      <div className="px-8 py-6">
        <input
          id="wizard-restaurant-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="z.B. Sushi Takumi"
          autoFocus
          className="w-full bg-[#0E0E16] border border-white/10 rounded-xl px-4 py-4 text-xl font-semibold text-white placeholder:text-gray-600 focus:outline-none focus:border-[#E8B86D]/50 focus:ring-1 focus:ring-[#E8B86D]/20 transition-all"
        />
        <p className="text-xs text-gray-600 mt-2">Tipp: Verwende deinen echten Restaurantnamen — so finden dich Gäste auf bizzn.de</p>
      </div>
      <StepFooter
        onNext={handleSubmit}
        onNextLabel="Restaurant erstellen"
        isPending={isPending}
        disableNext={!name.trim()}
      />
    </>
  )
}


// ─── Step 2: URL Import ───────────────────────────────────────────────────────

interface ScanProfile {
  restaurantName?: string
  description?: string
  address?: string
  phone?: string
  openingHours?: Record<string, string>
  cuisineType?: string
  coverImageUrl?: string
}

interface ScanResult {
  categories: unknown[]
  profile?: ScanProfile
  stats?: { categories: number; items: number; images: number }
}

function Step2Import({
  project,
  onNext,
  onBack,
}: {
  project: WizardProject
  onNext: (p?: Partial<WizardProject>) => void
  onBack: () => void
}) {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanDone, setScanDone] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const handleScan = async () => {
    if (!url.trim()) return
    setScanning(true)
    setScanError(null)
    setScanResult(null)

    try {
      // Phase 1: Scan → get categories + profile preview
      const res = await fetch('/api/menu/url-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), projectId: project.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        setScanError(data.error ?? 'Import fehlgeschlagen')
        return
      }

      setScanResult(data)

      // Phase 2: Confirm → write to DB (menu + profile)
      setConfirming(true)
      const confirmRes = await fetch('/api/menu/url-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          categories: data.categories,
          sourceUrl: url.trim(),
          profile: data.profile ?? null,
        }),
      })

      if (!confirmRes.ok) {
        const cd = await confirmRes.json().catch(() => ({}))
        setScanError(cd.error ?? 'Fehler beim Speichern')
        return
      }

      setScanDone(true)
    } catch {
      setScanError('Netzwerkfehler. Bitte versuche den manuellen Import.')
    } finally {
      setScanning(false)
      setConfirming(false)
    }
  }

  const profile = scanResult?.profile
  const stats = scanResult?.stats
  const detectedFields = profile ? [
    profile.description       && '📝 Beschreibung',
    profile.address           && '📍 Adresse',
    profile.phone             && '📞 Telefon',
    profile.cuisineType       && '🍽️ Küchen-Typ',
    profile.coverImageUrl     && '🖼️ Cover-Bild',
    profile.openingHours && Object.keys(profile.openingHours).length > 0 && '🕐 Öffnungszeiten',
  ].filter(Boolean) as string[] : []

  return (
    <>
      <StepHeader
        icon="✨"
        title="Speisekarte importieren"
        subtitle="KI liest deine Speisekarte, Öffnungszeiten & Adresse automatisch ein."
      />
      <div className="px-8 py-6 space-y-4">
        {/* Platform badges */}
        <div className="flex gap-2 flex-wrap">
          {[
            { name: 'Lieferando', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
            { name: 'Wolt', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
            { name: 'Uber Eats', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
            { name: 'Andere Website', color: 'bg-white/5 border-white/10 text-gray-400' },
          ].map((p) => (
            <span key={p.name} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${p.color}`}>
              {p.name}
            </span>
          ))}
        </div>

        {/* Success state */}
        {scanDone ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
              <Check className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Import erfolgreich!</div>
                {stats && (
                  <div className="text-xs text-emerald-300/70 mt-0.5">
                    {stats.categories} Kategorien · {stats.items} Gerichte{stats.images > 0 ? ` · ${stats.images} Bilder` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-filled profile fields */}
            {detectedFields.length > 0 && (
              <div className="p-4 bg-[#E8B86D]/5 border border-[#E8B86D]/15 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-[#E8B86D] uppercase tracking-wide">
                  🪄 Automatisch erkannt & vorausgefüllt
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detectedFields.map((field) => (
                    <span
                      key={field}
                      className="text-xs bg-[#E8B86D]/10 border border-[#E8B86D]/20 text-[#E8B86D]/80 px-2 py-0.5 rounded-full"
                    >
                      {field}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Diese Felder sind im nächsten Schritt bereits vorausgefüllt — du kannst sie jederzeit anpassen.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                id="wizard-import-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                placeholder="https://www.lieferando.de/speisekarte/dein-restaurant"
                className="flex-1 bg-[#0E0E16] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#E8B86D]/50 transition-all"
              />
              <button
                id="wizard-import-scan"
                onClick={handleScan}
                disabled={scanning || confirming || !url.trim()}
                className="flex items-center gap-2 bg-[#E8B86D] hover:bg-[#d4a55a] text-black font-semibold px-4 py-3 rounded-xl text-sm transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {scanning || confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {scanning ? 'Scanne…' : confirming ? 'Speichere…' : 'Importieren'}
              </button>
            </div>

            {scanError && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800/30 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {scanError}
              </div>
            )}

            <p className="text-xs text-gray-600">
              💡 Wir lesen automatisch: Speisekarte, Adresse, Öffnungszeiten & Beschreibung. Du kannst alles im nächsten Schritt anpassen.
            </p>
          </>
        )}
      </div>
      <StepFooter
        onBack={onBack}
        onNext={scanDone ? () => {
          // Pass auto-detected profile data to wizard state
          const profileUpdate: Partial<WizardProject> = {}
          if (profile?.description)   profileUpdate.description  = profile.description
          if (profile?.address)        profileUpdate.address      = profile.address
          if (profile?.phone)          profileUpdate.phone        = profile.phone
          if (profile?.cuisineType)    profileUpdate.cuisine_type = profile.cuisineType
          if (profile?.openingHours)   profileUpdate.opening_hours = profile.openingHours
          if (profile?.coverImageUrl)  profileUpdate.cover_image_url = profile.coverImageUrl
          onNext(Object.keys(profileUpdate).length > 0 ? profileUpdate : undefined)
        } : undefined}
        onNextLabel="Weiter"
        onSkip={!scanDone ? () => onNext() : undefined}
      />
    </>
  )
}



// ─── Step 3: Profil ───────────────────────────────────────────────────────────

function Step3Profile({
  project,
  onNext,
  onBack,
  isPending,
  startTransition,
  setError,
}: {
  project: WizardProject
  onNext: (p: Partial<WizardProject>) => void
  onBack: () => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  setError: (e: string | null) => void
}) {
  const [description, setDescription] = useState(project.description ?? '')
  const [street, setStreet] = useState(project.address ?? '')
  const [postalCode, setPostalCode] = useState(project.postal_code ?? '')
  const [city, setCity] = useState(project.city ?? '')
  const [phone, setPhone] = useState(project.phone ?? '')
  const [cuisineType, setCuisineType] = useState(project.cuisine_type ?? '')

  const handleNext = () => {
    setError(null)
    startTransition(async () => {
      const data = {
        description,
        address: street,
        postal_code: postalCode,
        city,
        phone,
        cuisine_type: cuisineType,
      }
      const result = await saveOnboardingProfile(project.id, data)
      if (result.error) { setError(result.error); return }
      onNext(data)
    })
  }

  const inputCls = 'w-full bg-[#0E0E16] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#E8B86D]/50 transition-all'

  return (
    <>
      <StepHeader icon="📝" title="Restaurant-Profil" subtitle="Diese Daten erscheinen auf deiner öffentlichen Profilseite." />
      <div className="px-8 py-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Beschreibung</label>
          <textarea
            id="wizard-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Was macht dein Restaurant besonders?"
            rows={3}
            className={inputCls + ' resize-none'}
          />
        </div>

        {/* Adresse: Straße, PLZ, Stadt getrennt */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Straße & Hausnummer</label>
          <input
            id="wizard-street"
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Hainstraße 55"
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">PLZ</label>
            <input
              id="wizard-postal"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="09111"
              maxLength={5}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Stadt</label>
            <input
              id="wizard-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Chemnitz"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Telefon</label>
            <input id="wizard-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 371 ..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Küchen-Typ</label>
            <input id="wizard-cuisine" type="text" value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} placeholder="Sushi, Pizza, Burger..." className={inputCls} />
          </div>
        </div>

        {project.cover_image_url && (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
            <ImageIcon className="w-4 h-4 flex-shrink-0" />
            Cover-Bild aus Import übernommen ✓
          </div>
        )}
      </div>
      <StepFooter onBack={onBack} onNext={handleNext} onSkip={() => onNext({})} isPending={isPending} />
    </>
  )
}


// ─── Step 4: Slug ─────────────────────────────────────────────────────────────

function Step4Slug({
  project,
  onNext,
  onBack,
  isPending,
  startTransition,
  setError,
}: {
  project: WizardProject
  onNext: (p: Partial<WizardProject>) => void
  onBack: () => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  setError: (e: string | null) => void
}) {
  // Auto-generate slug from name
  const generateSlug = (name: string) =>
    name.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const [slug, setSlug] = useState(project.slug ?? generateSlug(project.name))
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!slug) { setAvailable(null); return }
    const timer = setTimeout(async () => {
      setChecking(true)
      const result = await checkSlugAvailability(slug, project.id)
      setAvailable(result.available)
      setChecking(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [slug, project.id])

  const handleNext = () => {
    if (!slug || available === false) return
    setError(null)
    startTransition(async () => {
      const result = await saveOnboardingSlug(project.id, slug)
      if (result.error) { setError(result.error); return }
      onNext({ slug })
    })
  }

  return (
    <>
      <StepHeader icon="🔗" title="Deine Web-Adresse" subtitle="So findest du im Internet — deine persönliche Storefront." />
      <div className="px-8 py-6 space-y-4">
        <div className="flex items-center bg-[#0E0E16] border border-white/10 rounded-xl overflow-hidden focus-within:border-[#E8B86D]/50 transition-all">
          <span className="px-4 py-3 text-sm text-gray-500 border-r border-white/10 bg-white/3 whitespace-nowrap select-none">
            bizzn.de/
          </span>
          <input
            id="wizard-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="dein-restaurant"
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none"
          />
          <div className="px-3">
            {checking && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
            {!checking && available === true && <Check className="w-4 h-4 text-emerald-400" />}
            {!checking && available === false && <AlertCircle className="w-4 h-4 text-red-400" />}
          </div>
        </div>

        {available === false && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Diese Adresse ist bereits vergeben. Bitte wähle eine andere.
          </p>
        )}
        {available === true && slug && (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            Verfügbar! Deine Storefront: <span className="font-mono">bizzn.de/{slug}</span>
          </p>
        )}
      </div>
      <StepFooter onBack={onBack} onNext={handleNext} isPending={isPending} disableNext={!slug || available === false || available === null} />
    </>
  )
}

// ─── Step 5: Ordering Channels ────────────────────────────────────────────────

function Step5Channels({
  project,
  onNext,
  onBack,
  isPending,
  startTransition,
  setError,
}: {
  project: WizardProject
  onNext: (p: Partial<WizardProject>) => void
  onBack: () => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  setError: (e: string | null) => void
}) {
  const [pickup, setPickup] = useState(project.pickup_enabled ?? true)
  const [delivery, setDelivery] = useState(project.delivery_enabled ?? false)
  const [inStore, setInStore] = useState(project.in_store_enabled ?? false)
  const [deliveryFee, setDeliveryFee] = useState((project.delivery_fee_cents ?? 0) / 100)
  const [minOrder, setMinOrder] = useState((project.min_order_cents ?? 0) / 100)
  const [freeAbove, setFreeAbove] = useState((project.free_delivery_above_cents ?? 0) / 100)

  const handleNext = () => {
    setError(null)
    startTransition(async () => {
      const data = {
        pickup_enabled: pickup,
        delivery_enabled: delivery,
        in_store_enabled: inStore,
        delivery_fee_cents: Math.round(deliveryFee * 100),
        min_order_cents: Math.round(minOrder * 100),
        free_delivery_above_cents: Math.round(freeAbove * 100),
      }
      const result = await saveOnboardingChannels(project.id, data)
      if (result.error) { setError(result.error); return }
      onNext(data)
    })
  }

  const ToggleRow = ({ icon, label, desc, checked, onChange }: { icon: React.ReactNode; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5">
      <div className="flex items-center gap-3">
        <span className="text-[#E8B86D]">{icon}</span>
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-gray-500">{desc}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all ${checked ? 'bg-[#E8B86D]' : 'bg-white/10'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )

  return (
    <>
      <StepHeader icon="📦" title="Bestellkanäle" subtitle="Wie können deine Gäste bestellen?" />
      <div className="px-8 py-6 space-y-3">
        <ToggleRow icon={<ShoppingBag className="w-4 h-4" />} label="Abholung" desc="Kunden holen ihre Bestellung selbst ab" checked={pickup} onChange={setPickup} />
        <ToggleRow icon={<Truck className="w-4 h-4" />} label="Lieferung" desc="Du lieferst direkt zum Kunden" checked={delivery} onChange={setDelivery} />
        <ToggleRow icon={<Coffee className="w-4 h-4" />} label="Vor Ort (Tischbestellung)" desc="QR-Code am Tisch → direkt bestellen" checked={inStore} onChange={setInStore} />

        {delivery && (
          <div className="mt-4 p-4 bg-white/3 rounded-xl border border-white/5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Liefereinstellungen</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Liefergebühr (€)', value: deliveryFee, onChange: setDeliveryFee },
                { label: 'Mindestbestellung (€)', value: minOrder, onChange: setMinOrder },
                { label: 'Gratis ab (€)', value: freeAbove, onChange: setFreeAbove },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={f.value}
                    onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0E0E16] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8B86D]/50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <StepFooter onBack={onBack} onNext={handleNext} isPending={isPending} />
    </>
  )
}

// ─── Step 6: Discovery ────────────────────────────────────────────────────────

function Step6Discovery({
  project,
  onNext,
  onBack,
  isPending,
  startTransition,
  setError,
}: {
  project: WizardProject
  onNext: (p: Partial<WizardProject>) => void
  onBack: () => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  setError: (e: string | null) => void
}) {
  const [city, setCity] = useState(project.city ?? '')
  const [postalCode, setPostalCode] = useState(project.postal_code ?? '')
  const [isPublic, setIsPublic] = useState(project.is_public ?? true)

  const handleNext = () => {
    setError(null)
    startTransition(async () => {
      const data = { city, postal_code: postalCode, is_public: isPublic }
      const result = await saveOnboardingDiscovery(project.id, data)
      if (result.error) { setError(result.error); return }
      onNext(data)
    })
  }

  const inputCls = 'w-full bg-[#0E0E16] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#E8B86D]/50 transition-all'

  return (
    <>
      <StepHeader icon="📍" title="Standort & Discovery" subtitle="Damit Neukunden dich auf bizzn.de finden können." />
      <div className="px-8 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Stadt</label>
            <input id="wizard-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chemnitz" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">PLZ</label>
            <input id="wizard-postal" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="09111" className={inputCls} />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-[#E8B86D]" />
            <div>
              <div className="text-sm font-medium text-white">Auf bizzn.de entdeckt werden</div>
              <div className="text-xs text-gray-500">0 % Provision — du entscheidest wann du sichtbar wirst</div>
            </div>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-11 h-6 rounded-full transition-all ${isPublic ? 'bg-[#E8B86D]' : 'bg-white/10'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isPublic ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>
      <StepFooter onBack={onBack} onNext={handleNext} onSkip={() => onNext({})} isPending={isPending} />
    </>
  )
}

// ─── Step 6 (Rabatt / formerly 7): Willkommensrabatt ────────────────────────

function Step7Discount({
  project,
  onNext,
  onBack,
  isPending,
  startTransition,
  setError,
}: {
  project: WizardProject
  onNext: (p: Partial<WizardProject>) => void
  onBack: () => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  setError: (e: string | null) => void
}) {
  // Willkommensrabatt ist IMMER aktiv — Standard 10 %, nur erhöhbar (min 10 %)
  const [pct, setPct] = useState(Math.max(10, project.welcome_discount_pct ?? 10))

  const handleNext = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveOnboardingDiscount(project.id, true, pct)
      if (result.error) { setError(result.error); return }
      onNext({ welcome_discount_enabled: true, welcome_discount_pct: pct })
    })
  }

  return (
    <>
      <StepHeader icon="🎁" title="Willkommensrabatt" subtitle="Dein stärkstes Werkzeug um Neukunden zu gewinnen." />
      <div className="px-8 py-6 space-y-5">

        {/* Info-Banner: immer aktiv */}
        <div className="flex items-start gap-3 p-4 bg-[#E8B86D]/8 border border-[#E8B86D]/20 rounded-xl">
          <Tag className="w-4 h-4 text-[#E8B86D] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">Erstbestellungs-Rabatt aktiv</div>
            <div className="text-xs text-gray-400 mt-0.5">Jeder Neukunde bekommt automatisch {pct} % auf seine erste Bestellung.</div>
          </div>
        </div>

        {/* Slider: nur erhöhen */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Rabatt wählen</label>
            <span className="text-2xl font-bold text-[#E8B86D]">{pct} %</span>
          </div>
          <input
            id="wizard-discount-slider"
            type="range"
            min={10}
            max={30}
            step={5}
            value={pct}
            onChange={(e) => setPct(parseInt(e.target.value))}
            className="w-full accent-[#E8B86D]"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>10 % (Standard)</span>
            <span>15 %</span>
            <span>20 %</span>
            <span>25 %</span>
            <span>30 %</span>
          </div>
        </div>

        <div className="p-3 bg-white/3 border border-white/5 rounded-xl text-xs text-gray-500">
          💡 <strong className="text-gray-300">10 %</strong> ist der Standard — stark genug um Gäste von Lieferando abzuwerben, niedrig genug um profitabel zu bleiben. Du kannst jederzeit erhöhen.
        </div>
      </div>
      <StepFooter onBack={onBack} onNext={handleNext} isPending={isPending} />
    </>
  )
}

// ─── Step 8: Vorschau ─────────────────────────────────────────────────────────

function Step8Preview({
  project,
  onNext,
  onBack,
}: {
  project: WizardProject
  onNext: () => void
  onBack: () => void
}) {
  const previewUrl = project.slug && project.preview_token
    ? `/${project.slug}?preview=${project.preview_token}`
    : null

  return (
    <>
      <StepHeader icon="👁️" title="Vorschau" subtitle="So sieht dein Restaurant für Gäste aus." />
      <div className="px-8 py-6 space-y-4">
        {previewUrl ? (
          <>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0E0E16]" style={{ height: 420 }}>
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Storefront-Vorschau"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Eye className="w-3.5 h-3.5" />
              <span>Das ist deine persönliche Vorschau. Gäste sehen sie erst nach dem Go-Live.</span>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#E8B86D] hover:underline"
            >
              <Globe className="w-3.5 h-3.5" />
              Im neuen Tab öffnen
            </a>
          </>
        ) : (
          <div className="py-12 text-center text-gray-500 text-sm">
            <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
            Lege zuerst eine Web-Adresse (Schritt 4) fest, um die Vorschau zu sehen.
          </div>
        )}
      </div>
      <StepFooter onBack={onBack} onNext={onNext} onNextLabel="Weiter zu Live schalten" />
    </>
  )
}

// ─── Step 9: Go Live ──────────────────────────────────────────────────────────

function Step9Live({
  project,
  onBack,
  isPending,
  startTransition,
  setError,
}: {
  project: WizardProject
  onBack: () => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  setError: (e: string | null) => void
}) {
  const router = useRouter()

  const handleGoLive = () => {
    setError(null)
    startTransition(async () => {
      const result = await goLive(project.id)
      if (result.error) { setError(result.error); return }
      if (result.url) {
        window.location.href = result.url
      }
    })
  }

  const isAlreadyLive = project.status === 'active'

  return (
    <>
      <StepHeader icon="🚀" title={isAlreadyLive ? 'Du bist already live!' : 'Jetzt live gehen'} subtitle={isAlreadyLive ? 'Dein Restaurant ist bereits öffentlich sichtbar.' : 'Ein letzter Schritt — dann gehst du live.'} />
      <div className="px-8 py-6 space-y-5">
        {isAlreadyLive ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            <Check className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Live seit {project.live_since ? new Date(project.live_since).toLocaleDateString('de-DE') : 'kürzlich'}</div>
              <div className="text-xs opacity-70 mt-0.5">Du kannst den Wizard schließen und weiter anpassen.</div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary checklist */}
            <div className="space-y-2">
              {[
                { label: 'Restaurantname', done: !!project.name },
                { label: 'Speisekarte', done: true }, // always true after step 2
                { label: 'Profil', done: !!(project.description || project.address) },
                { label: 'Web-Adresse', done: !!project.slug },
                { label: 'Bestellkanäle', done: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500' : 'bg-white/10'}`}>
                    {item.done && <Check className="w-2.5 h-2.5 text-black" />}
                  </div>
                  <span className={item.done ? 'text-white' : 'text-gray-500'}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Price info */}
            <div className="p-4 bg-[#E8B86D]/5 border border-[#E8B86D]/20 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white">Bizzn-Plattform — Einmalzahlung</span>
                <span className="text-lg font-bold text-[#E8B86D]">99 €</span>
              </div>
              <p className="text-xs text-gray-500">
                Keine monatlichen Gebühren. Keine Provision. Du zahlst einmalig und bist dauerhaft dabei.
              </p>
            </div>
          </>
        )}
      </div>
      <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück
        </button>
        {isAlreadyLive ? (
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 bg-[#E8B86D] hover:bg-[#d4a55a] text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
          >
            Zum Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleGoLive}
            disabled={isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-[#E8B86D] to-[#d4a55a] hover:from-[#d4a55a] hover:to-[#c09148] text-black font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-[#E8B86D]/20 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '🚀'}
            {isPending ? 'Wird bearbeitet...' : 'Jetzt live gehen — 99 €'}
          </button>
        )}
      </div>
    </>
  )
}
