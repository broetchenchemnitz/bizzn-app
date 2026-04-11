'use client'

import { useState, useTransition } from 'react'
import { Car, Loader2, CheckCircle } from 'lucide-react'
import { updateProjectSettings } from '@/app/actions/project'

interface DriveInSettingsBlockProps {
  projectId: string
  initialEnabled: boolean
}

export function DriveInSettingsBlock({ projectId, initialEnabled }: DriveInSettingsBlockProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setSaved(false)
    startTransition(async () => {
      await updateProjectSettings(projectId, { drive_in_enabled: next })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px 22px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(199,161,122,0.1)', border: '1px solid rgba(199,161,122,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Car style={{ width: '18px', height: '18px', color: '#C7A17A' }} />
        </div>
        <div>
          <p style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '14px', margin: 0 }}>
            🚗 Drive-In (VIP-Abholung)
          </p>
          <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>
            Nur für Bizzn-Pass-Inhaber
          </p>
        </div>
      </div>

      <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.65', margin: '0 0 16px' }}>
        Bizzn-Pass-Inhaber können beim Bestellen den Drive-In-Modus wählen — 
        du bringst das Essen direkt zum Auto. Der Kunde gibt Kennzeichen oder Stellplatz an.
      </p>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: enabled ? '#C7A17A' : '#6b7280', fontSize: '13px', fontWeight: 700 }}>
          {enabled ? '✅ Drive-In aktiviert' : 'Drive-In deaktiviert'}
        </span>
        <button
          id="drive-in-toggle"
          onClick={toggle}
          disabled={isPending}
          style={{
            width: '48px', height: '26px', borderRadius: '999px', border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            background: enabled ? '#C7A17A' : 'rgba(255,255,255,0.1)',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: '3px',
            left: enabled ? '25px' : '3px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Feedback */}
      <div style={{ marginTop: '10px', minHeight: '24px' }}>
        {isPending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '12px' }}>
            <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 0.8s linear infinite' }} />
            Wird gespeichert…
          </div>
        )}
        {saved && !isPending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '12px' }}>
            <CheckCircle style={{ width: '13px', height: '13px' }} />
            Gespeichert!
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
