import { UtensilsCrossed } from 'lucide-react'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { domain: string } }) {
  const name = params.domain.charAt(0).toUpperCase() + params.domain.slice(1)
  return {
    title: `${name} | bizzn`,
    description: `Willkommen bei ${name} – präsentiert von bizzn.de`,
  }
}

export default function StorefrontPage({ params }: { params: { domain: string } }) {
  const slug = params.domain
  const displayName = slug.charAt(0).toUpperCase() + slug.slice(1)

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      {/* Logo / Icon */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="w-20 h-20 rounded-2xl bg-[#77CC00] flex items-center justify-center shadow-lg">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-[#1A1A1A] lowercase">bizzn</span>
      </div>

      {/* Welcome */}
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
          Willkommen bei{' '}
          <span className="text-[#77CC00]">{displayName}</span>
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Dein Restaurant-Storefront kommt bald. Bestelle direkt, schnell und
          ohne versteckte Gebühren.
        </p>

        {/* CTA badge */}
        <div className="inline-flex items-center gap-2 bg-[#F0FBD8] border border-[#77CC00]/30 text-[#4a8500] text-sm font-semibold px-5 py-2.5 rounded-full mt-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#77CC00]" />
          </span>
          Storefront aktiv · {slug}.bizzn.de
        </div>
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-gray-400">
        Präsentiert von{' '}
        <a
          href="https://www.bizzn.de"
          className="text-[#77CC00] font-semibold hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          bizzn.de
        </a>{' '}
        · Provisionsfreies Bestellsystem für Gastronomen
      </p>
    </div>
  )
}
