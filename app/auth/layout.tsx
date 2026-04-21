import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0E0E16] flex flex-col items-center justify-center px-4 py-12 font-sans">
      {/* Logo */}
      <Link href="/" className="mb-8">
        <span className="text-2xl font-bold text-[#E8B86D] tracking-wider uppercase">
          Bizzn<span className="text-white">.de</span>
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-600">
        0 % Provision · 100 % für dein Restaurant
      </p>
    </div>
  )
}
