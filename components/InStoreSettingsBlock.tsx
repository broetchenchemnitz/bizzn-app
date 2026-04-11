'use client'

import { useState, useTransition } from 'react'
import { updateInStoreSettings } from '@/app/actions/project'

interface InStoreSettingsBlockProps {
  projectId: string
  initialEnabled: boolean
}

export default function InStoreSettingsBlock({ projectId, initialEnabled }: InStoreSettingsBlockProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setSaved(false)
    startTransition(async () => {
      const { error } = await updateInStoreSettings(projectId, next)
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
            Tischbestellungen aktivieren
          </p>
          <p className="text-xs text-gray-500">
            {enabled
              ? 'Gäste können direkt vom Tisch bestellen ("Vor Ort").'
              : 'Bestellungen vor Ort sind aktuell deaktiviert.'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={isPending}
          aria-pressed={enabled}
          style={{
            flexShrink: 0, width: '48px', height: '26px', borderRadius: '999px',
            position: 'relative', border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            background: enabled ? 'var(--brand-accent)' : '#3a3a3a',
            transition: 'background 0.25s', opacity: isPending ? 0.6 : 1,
          }}
        >
          <span style={{
            position: 'absolute', top: '3px',
            left: enabled ? '25px' : '3px',
            width: '20px', height: '20px',
            background: '#fff', borderRadius: '50%',
            transition: 'left 0.25s',
          }} />
        </button>
      </div>

      {saved && !isPending && (
        <span className="text-xs" style={{ color: 'var(--brand-accent)' }}>✓ Speicherung erfolgreich</span>
      )}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}
