import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-20 bg-[#1A1A1A]">
      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center gap-8 max-w-2xl">

        {/* Vektor-Logo — scharf auf #1A1A1A via Lime-Fill */}
        <Link href="/" aria-label="Bizzn Startseite" className="mb-2 md:mb-6">
          <Image
            src="/logo.svg"
            alt="Hero Logo"
            width={500}
            height={500}
            className="w-64 md:w-96 lg:max-w-md max-w-full h-auto drop-shadow-2xl"
            priority
          />
        </Link>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Das Betriebssystem{' '}
          <span className="text-[#77CC00]">für die lokale Gastronomie</span>
        </h1>

        {/* Subline */}
        <p className="text-lg text-white/50 max-w-lg leading-relaxed">
          Speisekarte pflegen, Bestellungen verwalten, Zahlungen abwickeln —
          alles in einer Plattform. Kein Chaos, keine Zettelwirtschaft.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/auth/login"
            className="btn-primary btn-glow-primary px-7 py-3 text-base rounded-xl"
          >
            Kostenlos starten
          </Link>
          <Link
            href="/dashboard"
            className="btn-secondary px-7 py-3 text-base rounded-xl"
          >
            Demo ansehen
          </Link>
        </div>
      </div>
    </section>
  )
}
