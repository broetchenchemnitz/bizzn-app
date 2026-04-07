'use client'

import { useState, useTransition } from 'react'
import { updateDiscoverySettings } from '@/app/actions/discovery'
import { MapPin, Eye, EyeOff, Hash } from 'lucide-react'

interface DiscoverySettingsBlockProps {
  projectId: string
  initialIsPublic: boolean
  initialCity: string | null
  initialPostalCode: string | null
}

export default function DiscoverySettingsBlock({
  projectId,
  initialIsPublic,
  initialCity,
  initialPostalCode,
}: DiscoverySettingsBlockProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [city, setCity] = useState(initialCity ?? '')
  const [postalCode, setPostalCode] = useState(initialPostalCode ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    const next = !isPublic
    setIsPublic(next)
    setSaved(false)
    startTransition(async () => {
      const { error } = await updateDiscoverySettings(projectId, next, city, postalCode)
      if (error) setError(error)
      else setSaved(true)
    })
  }

  function handleSave() {
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const { error } = await updateDiscoverySettings(projectId, isPublic, city, postalCode)
      if (error) setError(error)
      else setSaved(true)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <p className="text-sm font-medium text-white" style={{ marginBottom: '2px' }}>
            Auf bizzn.de anzeigen
          </p>
          <p className="text-xs text-gray-500">
            {isPublic
              ? 'Dein Restaurant ist auf der Discovery-Seite sichtbar'
              : 'Dein Restaurant ist nicht öffentlich gelistet'}
          </p>
        </div>
        <button
          id={`discovery-toggle-${projectId}`}
          onClick={handleToggle}
          disabled={isPending}
          aria-pressed={isPublic}
          style={{
            flexShrink: 0,
            width: '48px',
            height: '26px',
            borderRadius: '999px',
            position: 'relative',
            border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            background: isPublic ? 'var(--brand-accent)' : '#3a3a3a',
            transition: 'background 0.25s',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          <span style={{
            position: 'absolute',
            top: '3px',
            left: isPublic ? '25px' : '3px',
            width: '20px',
            height: '20px',
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.25s',
          }} />
        </button>
      </div>

      {/* Status indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '10px',
        background: isPublic ? 'rgba(199,161,122,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isPublic ? 'rgba(199,161,122,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}>
        {isPublic
          ? <Eye className="w-4 h-4" style={{ color: 'var(--brand-accent)', flexShrink: 0 }} />
          : <EyeOff className="w-4 h-4 text-gray-500" style={{ flexShrink: 0 }} />
        }
        <p className="text-xs" style={{ color: isPublic ? 'var(--brand-accent)' : '#6b7280', margin: 0 }}>
          {isPublic
            ? 'Dein Restaurant erscheint in der Suche auf bizzn.de — Kunden können dich finden.'
            : 'Deaktiviert — du entscheidest wann du sichtbar wirst.'
          }
        </p>
      </div>

      {/* City + PLZ fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>

        {/* City */}
        <div>
          <label
            htmlFor={`discovery-city-${projectId}`}
            className="text-xs font-medium text-gray-400"
            style={{ display: 'block', marginBottom: '8px' }}
          >
            Stadt
          </label>
          <div style={{ position: 'relative' }}>
            <MapPin
              className="w-4 h-4 text-gray-500"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              id={`discovery-city-${projectId}`}
              type="text"
              value={city}
              onChange={(e) => { setCity(e.target.value); setSaved(false) }}
              placeholder="z.B. Chemnitz"
              className="placeholder:text-gray-600"
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#e5e7eb',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>
        </div>

        {/* Postal Code */}
        <div>
          <label
            htmlFor={`discovery-plz-${projectId}`}
            className="text-xs font-medium text-gray-400"
            style={{ display: 'block', marginBottom: '8px' }}
          >
            PLZ
          </label>
          <div style={{ position: 'relative' }}>
            <Hash
              className="w-4 h-4 text-gray-500"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              id={`discovery-plz-${projectId}`}
              type="text"
              value={postalCode}
              onChange={(e) => { setPostalCode(e.target.value); setSaved(false) }}
              placeholder="09116"
              maxLength={10}
              className="placeholder:text-gray-600"
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#e5e7eb',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          id={`discovery-save-${projectId}`}
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            background: isPending ? 'rgba(199,161,122,0.4)' : 'var(--brand-accent)',
            color: '#111',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.background = 'var(--brand-hover)' }}
          onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.background = 'var(--brand-accent)' }}
        >
          {isPending ? 'Speichert…' : 'Speichern'}
        </button>

        {saved && !isPending && (
          <span className="text-xs" style={{ color: 'var(--brand-accent)' }}>✓ Gespeichert</span>
        )}
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    </div>
  )
}
