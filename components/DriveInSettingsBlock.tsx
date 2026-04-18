'use client'

import { Car } from 'lucide-react'

export function DriveInSettingsBlock() {
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

      {/* Always active badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#C7A17A', fontSize: '13px', fontWeight: 700 }}>
          ✅ Drive-In aktiviert
        </span>
        <span style={{
          fontSize: '10px', fontWeight: 600, color: '#4ade80',
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '3px 10px', borderRadius: '999px',
        }}>
          ✓ Immer aktiv
        </span>
      </div>
    </div>
  )
}
