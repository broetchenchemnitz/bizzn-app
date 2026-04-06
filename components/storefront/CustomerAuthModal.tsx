'use client'

import { useState, useEffect, useRef } from 'react'
import { signUpCustomer, signInCustomer } from '@/app/actions/customer'
import { Loader2, X, User, Mail, Lock, Phone, ChevronRight } from 'lucide-react'

type Tab = 'login' | 'register'

type Props = {
  projectId: string
  projectName: string
  onSuccess?: (name: string) => void
}

export default function CustomerAuthModal({ projectId, projectName, onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('register')

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [consentPush, setConsentPush] = useState(true)
  const [consentEmail, setConsentEmail] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backdropRef = useRef<HTMLDivElement>(null)

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) setIsOpen(false)
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const reset = () => {
    setError(null)
    setName('')
    setEmail('')
    setPassword('')
    setPhone('')
    setConsentPush(true)
    setConsentEmail(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    let result

    if (tab === 'register') {
      result = await signUpCustomer({
        projectId,
        name,
        email,
        password,
        phone: phone || undefined,
        consentPush,
        consentEmail,
      })
    } else {
      result = await signInCustomer({ projectId, email, password })
    }

    setIsSubmitting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    // Erfolg
    setIsOpen(false)
    reset()
    const displayName = tab === 'register' ? name : email.split('@')[0]
    onSuccess?.(displayName)
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setError(null)
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        id="customer-auth-trigger"
        onClick={() => { setIsOpen(true); reset() }}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#C7A17A] transition-colors font-medium group"
      >
        <User className="w-3.5 h-3.5" />
        <span>Anmelden / Konto anlegen</span>
        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          aria-modal="true"
          role="dialog"
          aria-label="Kunden-Login"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200">

            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#2a2118] to-[#1a1a1a] px-6 pt-6 pb-5">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-[10px] font-bold text-[#C7A17A] tracking-widest uppercase mb-1">
                {projectName}
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">
                {tab === 'register' ? 'Konto anlegen' : 'Willkommen zurück'}
              </h2>
              <p className="text-xs text-white/50 mt-1">
                Dein Konto gilt für alle Restaurants auf Bizzn.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => switchTab('register')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  tab === 'register'
                    ? 'text-[#C7A17A] border-b-2 border-[#C7A17A]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Registrieren
              </button>
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  tab === 'login'
                    ? 'text-[#C7A17A] border-b-2 border-[#C7A17A]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Anmelden
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
                  {error}
                </div>
              )}

              {/* Name — nur bei Register */}
              {tab === 'register' && (
                <div>
                  <label htmlFor="customer-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="customer-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dein Name"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
                    />
                  </div>
                </div>
              )}

              {/* E-Mail */}
              <div>
                <label htmlFor="customer-email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  E-Mail *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="customer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="du@beispiel.de"
                    required
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
                  />
                </div>
              </div>

              {/* Passwort */}
              <div>
                <label htmlFor="customer-password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Passwort *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="customer-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'register' ? 'Mind. 6 Zeichen' : '••••••••'}
                    required
                    minLength={6}
                    autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
                  />
                </div>
              </div>

              {/* Telefon — nur bei Register, optional */}
              {tab === 'register' && (
                <div>
                  <label htmlFor="customer-phone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Telefon <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="customer-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+49 171 1234567"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition"
                    />
                  </div>
                </div>
              )}

              {/* Opt-Ins — nur bei Register */}
              {tab === 'register' && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      id="consent-push"
                      type="checkbox"
                      checked={consentPush}
                      onChange={(e) => setConsentPush(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#C7A17A] flex-shrink-0"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Ich möchte Push-Benachrichtigungen über Angebote und Neuigkeiten von{' '}
                      <strong className="text-gray-700">{projectName}</strong> erhalten.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      id="consent-email"
                      type="checkbox"
                      checked={consentEmail}
                      onChange={(e) => setConsentEmail(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#C7A17A] flex-shrink-0"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Ich möchte E-Mail-Newsletter von{' '}
                      <strong className="text-gray-700">{projectName}</strong> erhalten.
                    </span>
                  </label>
                </div>
              )}

              {/* Submit */}
              <button
                id="customer-auth-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#C7A17A] hover:bg-[#b8906a] text-white font-bold py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 mt-2 shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  tab === 'register' ? 'Konto erstellen' : 'Anmelden'
                )}
              </button>

              {/* Legal Note */}
              {tab === 'register' && (
                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  Mit der Registrierung akzeptierst du die{' '}
                  <a href="/agb" className="underline hover:text-[#C7A17A]">AGB</a>
                  {' '}und{' '}
                  <a href="/datenschutz" className="underline hover:text-[#C7A17A]">Datenschutzerklärung</a>.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
