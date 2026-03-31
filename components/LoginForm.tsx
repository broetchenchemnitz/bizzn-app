'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { Lock, Mail, Loader2 } from 'lucide-react'
import { signIn, signUp, type AuthState } from '@/app/auth/actions'

const initialState: AuthState = { error: null }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-gray-950 bg-[#77CC00] hover:bg-[#66B300] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-[#77CC00] transition-colors duration-200 flex justify-center items-center disabled:opacity-70"
    >
      {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
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
    <div className="bg-gray-900 border border-gray-800 shadow-2xl rounded-xl p-8 sm:px-10 w-full max-w-md">
      <div className="flex justify-center mb-8">
        <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center">
          <Lock className="text-white w-6 h-6" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-center mb-6 text-white">
        {isSignUp ? 'Create an Account' : 'Welcome Back'}
      </h2>

      {state.error && (
        <div className="mb-4 p-3 bg-red-950 text-red-400 text-sm rounded-lg text-center border border-red-800">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#77CC00] focus:border-transparent transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#77CC00] focus:border-transparent transition-all duration-200"
              placeholder="••••••••"
            />
          </div>
        </div>

        <SubmitButton label={isSignUp ? 'Sign Up' : 'Sign In'} />
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-gray-500 hover:text-[#77CC00] transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}
