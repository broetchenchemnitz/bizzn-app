'use client'

import { useState } from 'react'
import { Car, CheckCircle2, Loader2 } from 'lucide-react'
import { arriveAtDriveIn } from '@/app/actions/drive-in'

interface DriveInArrivalCardProps {
  orderId: string
  /** Bereits als angekommen markiert */
  arrived?: boolean
  arrivedPlate?: string | null
}

export function DriveInArrivalCard({
  orderId,
  arrived: initialArrived = false,
  arrivedPlate = null,
}: DriveInArrivalCardProps) {
  const [arrived, setArrived] = useState(initialArrived)
  const [plate, setPlate] = useState('')
  const [locationHint, setLocationHint] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleArrive = async () => {
    setError(null)
    setLoading(true)
    const res = await arriveAtDriveIn(orderId, plate, locationHint)
    setLoading(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    setArrived(true)
    setShowForm(false)
  }

  // Bereits gemeldet
  if (arrived) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: '12px', padding: '12px 16px', marginTop: '12px',
      }}>
        <CheckCircle2 style={{ width: '18px', height: '18px', color: '#22c55e', flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>
            Restaurant wurde informiert
          </p>
          {arrivedPlate && (
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Kennzeichen: {arrivedPlate}
            </p>
          )}
          {locationHint.trim() && (
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>
              Standort: {locationHint}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(199,161,122,0.06)', border: '1px solid rgba(199,161,122,0.2)',
      borderRadius: '12px', padding: '14px 16px', marginTop: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'rgba(199,161,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Car style={{ width: '16px', height: '16px', color: '#c7a17a' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#c7a17a' }}>
            Drive-In — Bizzn-Pass
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>
            Lass dein Essen zu dir bringen
          </p>
        </div>
      </div>

      {!showForm ? (
        <button
          id={`drive-in-arrive-${orderId}`}
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            border: '1px solid rgba(199,161,122,0.4)',
            background: 'rgba(199,161,122,0.1)', color: '#c7a17a',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(199,161,122,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(199,161,122,0.1)')}
        >
          <Car style={{ width: '14px', height: '14px' }} />
          Ich bin da! 🚗
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            id={`drive-in-plate-${orderId}`}
            type="text"
            value={plate}
            onChange={e => setPlate(e.target.value.toUpperCase())}
            placeholder="Kennzeichen (z.B. C-AB 1234)"
            maxLength={12}
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(199,161,122,0.35)',
              background: 'rgba(255,255,255,0.04)', color: '#f3f4f6',
              fontSize: '14px', fontWeight: 600, letterSpacing: '1px',
              outline: 'none', boxSizing: 'border-box',
              textTransform: 'uppercase',
            }}
            onKeyDown={e => e.key === 'Enter' && handleArrive()}
          />
          <input
            id={`drive-in-location-${orderId}`}
            type="text"
            value={locationHint}
            onChange={e => setLocationHint(e.target.value)}
            placeholder="Wo stehst du? z.B. Parkplatz vorne links (optional)"
            maxLength={60}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: '#d1d5db',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
            onKeyDown={e => e.key === 'Enter' && handleArrive()}
          />
          {error && (
            <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              style={{
                flex: 1, padding: '9px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent', color: '#6b7280',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
            <button
              id={`drive-in-submit-${orderId}`}
              onClick={handleArrive}
              disabled={loading || !plate.trim()}
              style={{
                flex: 2, padding: '9px', borderRadius: '10px', border: 'none',
                background: plate.trim() && !loading
                  ? 'linear-gradient(135deg, #c7a17a, #d4a870)'
                  : 'rgba(199,161,122,0.3)',
                color: '#111', fontWeight: 700, fontSize: '13px',
                cursor: plate.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              {loading
                ? <><Loader2 style={{ width: '13px', height: '13px', animation: 'spin 0.8s linear infinite' }} /> Senden…</>
                : <>🚗 Abschicken</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
