'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react'
import { signIn, signUp, type AuthState } from '@/app/auth/actions'

const initialState: AuthState = { error: null }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-black bg-[#E8B86D] hover:bg-[#d4a55a] focus:outline-none focus:ring-2 focus:ring-[#E8B86D]/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#E8B86D]/10"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  )
}

export default function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)

  const [signInState, signInAction] = useFormState(signIn, initialState)
  const [signUpState, signUpAction] = useFormState(signUp, initialState)

  const action = isSignUp ? signUpAction : signInAction
  const state = isSignUp ? signUpState : signInState

  return (
    <div className="bg-[#1A1A2E] border border-white/8 shadow-2xl rounded-2xl p-8 w-full">
      {/* Header */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 bg-[#E8B86D]/10 border border-[#E8B86D]/20 rounded-2xl flex items-center justify-center">
          <Lock className="text-[#E8B86D] w-5 h-5" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-center mb-1 text-white">
        {isSignUp ? 'Konto erstellen' : 'Willkommen zurück'}
      </h2>
      <p className="text-center text-sm text-gray-500 mb-7">
        {isSignUp
          ? 'Starte deinen Bizzn-Auftritt in wenigen Minuten.'
          : 'Melde dich an, um dein Restaurant zu verwalten.'}
      </p>

      {/* Error */}
      {state?.error && (
        <div className="mb-5 p-3 bg-red-950/50 text-red-400 text-sm rounded-xl border border-red-800/50 text-center">
          {state.error}
        </div>
      )}

      {/* Success */}
      {state?.success && (
        <div className="mb-5 p-3 bg-emerald-950/50 text-emerald-400 text-sm rounded-xl border border-emerald-800/50 text-center">
          ✅ {state.success}
        </div>
      )}

      {/* Form */}
      <form action={action} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">
            E-Mail-Adresse
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full pl-10 pr-4 py-3 bg-[#0E0E16] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#E8B86D]/40 focus:ring-1 focus:ring-[#E8B86D]/20 transition-all"
              placeholder="du@restaurant.de"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">
            Passwort
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full pl-10 pr-4 py-3 bg-[#0E0E16] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#E8B86D]/40 focus:ring-1 focus:ring-[#E8B86D]/20 transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <SubmitButton label={isSignUp ? 'Konto erstellen' : 'Anmelden'} />
      </form>

      {/* Toggle */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-gray-500 hover:text-[#E8B86D] transition-colors"
        >
          {isSignUp
            ? 'Bereits registriert? Jetzt anmelden →'
            : 'Noch kein Konto? Jetzt registrieren →'}
        </button>
      </div>
    </div>
  )
}
