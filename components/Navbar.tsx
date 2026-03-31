"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { LogOut, LayoutDashboard } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      setLoading(false)
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav className="safari-header w-full px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-50 min-w-0 border-b border-white/5">
      {/* ── Marken-Logo ── */}
      <Link href="/" className="flex items-center shrink-0" aria-label="Bizzn – Zur Startseite">
        <Image
          src="/logo.svg"
          alt="Bizzn Logo"
          width={110}
          height={42}
          className="h-9 w-auto md:h-10"
          priority={true}
        />
      </Link>

      {/* ── Navigation ── */}
      <div className="flex items-center gap-3">
        {!loading && (
          user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-white/40 hover:text-red-400 transition-colors ml-2"
                aria-label="Abmelden"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Abmelden</span>
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="btn-primary btn-glow-primary text-xs sm:text-sm"
            >
              Anmelden
            </Link>
          )
        )}
      </div>
    </nav>
  )
}
