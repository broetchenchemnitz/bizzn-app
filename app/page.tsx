import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-20 bg-[#1A1A1A]">
      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center gap-8 max-w-2xl">

        {/* Vector Logo — crisp on #1A1A1A via lime fill */}
        <Link href="/" aria-label="Bizzn Home">
          <Image
            src="/logo.svg"
            alt="Bizzn Logo"
            width={260}
            height={98}
            className="h-20 w-auto md:h-24 drop-shadow-[0_0_24px_rgba(119,204,0,0.25)]"
            priority={true}
          />
        </Link>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          The Operating System{' '}
          <span className="text-[#77CC00]">for Modern Restaurants</span>
        </h1>

        {/* Subline */}
        <p className="text-lg text-white/50 max-w-lg leading-relaxed">
          Manage menus, handle orders, and accept payments — all in one beautifully
          designed platform built for speed and clarity.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link href="/auth/login" className="btn-primary btn-glow-primary px-7 py-3 text-base rounded-xl">
            Get Started Free
          </Link>
          <Link href="/dashboard" className="btn-secondary px-7 py-3 text-base rounded-xl">
            View Demo
          </Link>
        </div>
      </div>
    </section>
  )
}
