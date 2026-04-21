import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { ReactNode } from 'react'

export default async function WizardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#0E0E16] text-white font-sans flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/dashboard" aria-label="Bizzn Dashboard">
          <span className="text-xl font-bold text-[#E8B86D] tracking-wider uppercase">
            Bizzn<span className="text-white">.de</span>
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Abbrechen
        </Link>
      </header>

      {/* ── Wizard Content ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  )
}
