"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
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
    <nav className="w-full bg-[#242424] border-b border-white/5 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50 min-w-0">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.svg" alt="Bizzn Logo" width={100} height={38} priority />
      </Link>
      <div className="flex items-center gap-4">
        {!loading && (
          user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-400 transition-colors ml-4"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="px-4 py-2 bg-[#77CC00] hover:bg-[#66b300] text-black text-sm font-bold rounded-lg transition-colors">
              Sign In
            </Link>
          )
        )}
      </div>
    </nav>
  )
}
