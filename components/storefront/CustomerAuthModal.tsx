'use client'

import { useState, useEffect, useRef } from 'react'
import { signUpCustomer, signInCustomer } from '@/app/actions/customer'
import { Loader2, X, Mail, Lock, User, Phone, ChevronRight } from 'lucide-react'

type Tab = 'login' | 'register'

type Props = {
  projectId: string
  projectName: string
  onSuccess?: (name: string) => void
  customTrigger?: React.ReactNode
  isEmbedded?: boolean
}

export default function CustomerAuthModal({ projectId, projectName, onSuccess, customTrigger }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('register')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [consentPush, setConsentPush] = useState(true)
  const [consentEmail, setConsentEmail] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backdropRef = useRef<HTMLDivElement>(null)

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) setIsOpen(false)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const reset = () => {
    setError(null); setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setPhone('')
    setConsentPush(true); setConsentEmail(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    let result
    if (tab === 'register') {
      result = await signUpCustomer({ projectId, firstName, lastName, email, password, phone: phone || undefined, consentPush, consentEmail })
    } else {
      result = await signInCustomer({ projectId, email, password })
    }

    setIsSubmitting(false)
    if ('error' in result) { setError(result.error); return }

    setIsOpen(false)
    reset()
    const displayName = tab === 'register' ? `${firstName} ${lastName}` : email.split('@')[0]
    onSuccess?.(displayName)
  }

  const switchTab = (t: Tab) => { setTab(t); setError(null) }

  return (
    <>
      {/* Trigger */}
      {customTrigger ? (
        <div onClick={() => { setIsOpen(true); reset() }} className="contents">
          {customTrigger}
        </div>
      ) : (
        <button
          id="customer-auth-trigger"
          onClick={() => { setIsOpen(true); reset() }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#C7A17A] transition-colors font-medium group"
        >
          <User className="w-3.5 h-3.5" />
          <span>Anmelden / Konto anlegen</span>
          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            padding: '16px',
            animation: 'authFadeIn 0.2s ease',
          }}
          aria-modal="true" role="dialog" aria-label="Kunden-Login"
        >
          <div style={{
            width: '100%', maxWidth: '400px',
            borderRadius: '20px',
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            overflow: 'hidden',
            animation: 'authSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
          }}>

            {/* Header */}
            <div style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              position: 'relative',
            }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  position: 'absolute', top: '20px', right: '20px',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', cursor: 'pointer', color: '#9ca3af',
                  display: 'flex', alignItems: 'center', padding: '6px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#f0f0f0' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#9ca3af' }}
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>

              <p style={{ fontSize: '11px', fontWeight: 700, color: '#C7A17A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                {projectName}
              </p>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#f0f0f0', lineHeight: 1.2, margin: 0 }}>
                {tab === 'register' ? 'Konto anlegen' : 'Willkommen zurück'}
              </h2>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Dein Konto gilt für alle Restaurants auf Bizzn.
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {(['register', 'login'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  style={{
                    flex: 1, padding: '12px', fontSize: '13px', fontWeight: 700,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: tab === t ? '#C7A17A' : '#6b7280',
                    borderBottom: tab === t ? '2px solid #C7A17A' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'register' ? 'Registrieren' : 'Anmelden'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171', fontSize: '12px',
                }}>
                  {error}
                </div>
              )}

              {/* Name — nur Register */}
              {tab === 'register' && (
                <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Vorname *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563' }} />
                    <input
                      id="customer-firstname" type="text" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Dein Vorname" required
                      style={{
                        width: '100%', padding: '11px 12px 11px 36px', borderRadius: '10px', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#f0f0f0', fontSize: '14px', outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Nachname *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563' }} />
                    <input
                      id="customer-lastname" type="text" value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dein Nachname" required
                      style={{
                        width: '100%', padding: '11px 12px 11px 36px', borderRadius: '10px', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#f0f0f0', fontSize: '14px', outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>
                </>
              )}

              {/* E-Mail */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  E-Mail *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563' }} />
                  <input
                    id="customer-email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="du@beispiel.de" required autoComplete="email"
                    style={{
                      width: '100%', padding: '11px 12px 11px 36px', borderRadius: '10px', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f0f0f0', fontSize: '14px', outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>

              {/* Passwort */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Passwort *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563' }} />
                  <input
                    id="customer-password" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'register' ? 'Mind. 6 Zeichen' : '••••••••'}
                    required minLength={6}
                    autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                    style={{
                      width: '100%', padding: '11px 12px 11px 36px', borderRadius: '10px', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f0f0f0', fontSize: '14px', outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>

              {/* Telefon — optional, nur Register */}
              {tab === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Telefon <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#4b5563' }} />
                    <input
                      id="customer-phone" type="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+49 171 1234567"
                      style={{
                        width: '100%', padding: '11px 12px 11px 36px', borderRadius: '10px', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#f0f0f0', fontSize: '14px', outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(199,161,122,0.6)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>
              )}

              {/* Opt-Ins */}
              {tab === 'register' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  {[
                    { id: 'consent-push', checked: consentPush, onChange: setConsentPush, label: <>Push-Benachrichtigungen über Angebote von <strong style={{ color: '#d1d5db' }}>{projectName}</strong></> },
                    { id: 'consent-email', checked: consentEmail, onChange: setConsentEmail, label: <>E-Mail-Newsletter von <strong style={{ color: '#d1d5db' }}>{projectName}</strong></> },
                  ].map(({ id, checked, onChange, label }) => (
                    <label key={id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        id={id} type="checkbox" checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: '#C7A17A', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>{label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Submit */}
              <button
                id="customer-auth-submit"
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', marginTop: '4px',
                  background: isSubmitting ? 'rgba(199,161,122,0.4)' : 'linear-gradient(135deg, #c7a17a, #d4a870)',
                  color: '#111', fontWeight: 900, fontSize: '14px',
                  border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(199,161,122,0.3)',
                  transition: 'all 0.2s', letterSpacing: '0.01em',
                }}
              >
                {isSubmitting
                  ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite' }} />
                  : tab === 'register' ? 'Konto erstellen & Bestellen' : 'Anmelden & Bestellen'
                }
              </button>

              {/* Legal */}
              {tab === 'register' && (
                <p style={{ fontSize: '10px', color: '#374151', textAlign: 'center', lineHeight: '1.6' }}>
                  Mit der Registrierung akzeptierst du die{' '}
                  <a href="/agb" style={{ color: '#6b7280', textDecoration: 'underline' }}>AGB</a>
                  {' '}und die{' '}
                  <a href="/datenschutz" style={{ color: '#6b7280', textDecoration: 'underline' }}>Datenschutzerklärung</a>.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes authSlideUp {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
