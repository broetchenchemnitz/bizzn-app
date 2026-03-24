'use client'

import { useActionState, useState } from 'react'
import { Lock, Mail, Loader2 } from 'lucide-react'
import { signIn, signUp, type AuthState } from '@/app/auth/actions'

const initialState: AuthState = { error: null }

export default function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)

  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState)
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState)

  const action = isSignUp ? signUpAction : signInAction
  const pending = isSignUp ? signUpPending : signInPending
  const state = isSignUp ? signUpState : signInState

  return (
    <div className="w-full max-w-md p-8 bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex justify-center mb-8">
        <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center">
          <Lock className="text-white w-6 h-6" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
        {isSignUp ? 'Create an Account' : 'Welcome Back'}
      </h2>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
          {state.error}
        </div>
      )}

      {isSignUp && !state.error && signUpState.error === null && signUpPending === false && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center hidden" />
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 px-4 bg-brand hover:bg-[#66b300] text-white font-medium rounded-lg transition-colors flex justify-center items-center disabled:opacity-70"
        >
          {pending
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}
