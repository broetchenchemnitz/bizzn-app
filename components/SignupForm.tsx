'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { signUp, type AuthState } from '@/app/auth/actions'

const initialState: AuthState = { error: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-black bg-[#E8B86D] hover:bg-[#d4a55a] focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#E8B86D]/10"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>Konto erstellen <ArrowRight className="w-4 h-4" /></>
      )}
    </button>
  )
}

export default function SignupForm() {
  const [state, action] = useFormState(signUp, initialState)

  return (
    <div className="bg-[#1A1A2E] border border-white/8 shadow-2xl rounded-2xl p-8 w-full">
      {/* Header */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 bg-[#E8B86D]/10 border border-[#E8B86D]/20 rounded-2xl flex items-center justify-center">
          <Lock className="text-[#E8B86D] w-5 h-5" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-center mb-1 text-white">Konto erstellen</h2>
      <p className="text-center text-sm text-gray-500 mb-7">
        Starte deinen Bizzn-Auftritt in wenigen Minuten.
      </p>

      {state?.error && (
        <div className="mb-5 p-3 bg-red-950/50 text-red-400 text-sm rounded-xl border border-red-800/50 text-center">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="mb-5 p-3 bg-emerald-950/50 text-emerald-400 text-sm rounded-xl border border-emerald-800/50 text-center">
          ✅ {state.success}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">E-Mail-Adresse</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="w-full pl-10 pr-4 py-3 bg-[#0E0E16] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#E8B86D]/40 focus:ring-1 focus:ring-[#E8B86D]/20 transition-all"
              placeholder="du@restaurant.de"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">Passwort</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              id="password" name="password" type="password" required autoComplete="new-password"
              minLength={8}
              className="w-full pl-10 pr-4 py-3 bg-[#0E0E16] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#E8B86D]/40 focus:ring-1 focus:ring-[#E8B86D]/20 transition-all"
              placeholder="Mindestens 8 Zeichen"
            />
          </div>
        </div>

        <SubmitButton />
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="text-sm text-gray-500 hover:text-[#E8B86D] transition-colors"
        >
          Bereits registriert? Jetzt anmelden →
        </Link>
      </div>
    </div>
  )
}
