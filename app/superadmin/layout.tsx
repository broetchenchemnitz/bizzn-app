import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import Link from 'next/link'

export default async function SuperadminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Auth-Guard: Nur Superadmin darf diese Seiten sehen
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    redirect('/dashboard')
  }

  const userEmail = user.email

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 font-sans">
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#1a0000] border-b border-red-900/60 shadow-[0_2px_20px_rgba(220,38,38,0.15)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/superadmin" className="text-xl font-bold text-red-400 tracking-widest uppercase hover:text-red-300 transition-colors">
              ⚡ Bizzn <span className="text-white/60">Admin</span>
            </Link>
            <span className="hidden sm:flex items-center gap-1.5 bg-red-950 border border-red-800 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              SUPERADMIN
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden md:block">{userEmail}</span>
            <Link
              href="/dashboard"
              className="text-xs text-gray-400 hover:text-white transition-colors border border-[#333] hover:border-gray-500 px-3 py-1.5 rounded-md"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="bg-[#150000] border-b border-red-900/30">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {[
            { href: '/superadmin', label: '📊 Übersicht' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-all border-b-2 border-transparent hover:border-red-700"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
