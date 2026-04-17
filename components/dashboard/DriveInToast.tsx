'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

interface DriveInAlert {
  id: string
  orderId: string
  customerName: string | null
  plate: string | null
  locationHint: string | null
  arrivedAt: string
}

export function DriveInToast({ projectId }: { projectId: string }) {
  const [alerts, setAlerts] = useState<DriveInAlert[]>([])
  const audioRef = useRef<AudioContext | null>(null)

  const playChime = () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      const ctx = audioRef.current
      if (ctx.state === 'suspended') void ctx.resume()
      // Freundlicher Chime: aufsteigende Dur-Terz
      ;[523, 659, 784].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.18)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.25)
        o.start(ctx.currentTime + i * 0.18)
        o.stop(ctx.currentTime + i * 0.18 + 0.25)
      })
    } catch { /* blocked */ }
  }

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const ch = supabase
      .channel(`drive-in-toast-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            customer_name: string | null
            drive_in_arrived_at: string | null
            drive_in_license_plate: string | null
            drive_in_location_hint: string | null
          }
          // Nur reagieren wenn drive_in_arrived_at neu gesetzt wurde
          const oldRow = payload.old as { drive_in_arrived_at: string | null }
          if (row.drive_in_arrived_at && !oldRow.drive_in_arrived_at) {
            playChime()
            const alert: DriveInAlert = {
              id: crypto.randomUUID(),
              orderId: row.id,
              customerName: row.customer_name,
              plate: row.drive_in_license_plate,
              locationHint: row.drive_in_location_hint,
              arrivedAt: row.drive_in_arrived_at,
            }
            setAlerts(prev => [alert, ...prev].slice(0, 3))
            // Auto-dismiss nach 30 Sekunden
            setTimeout(() => {
              setAlerts(prev => prev.filter(a => a.id !== alert.id))
            }, 30_000)
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(ch) }
  }, [projectId])

  if (alerts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 340,
    }}>
      {alerts.map(alert => (
        <div
          key={alert.id}
          style={{
            background: 'linear-gradient(135deg, #1a1408, #1f1810)',
            border: '2px solid #C7A17A',
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: '0 8px 40px rgba(199,161,122,0.4), 0 2px 8px rgba(0,0,0,0.8)',
            animation: 'driveInSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Glow */}
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 100, height: 100, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(199,161,122,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🚗</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#C7A17A', letterSpacing: '0.05em' }}>
                  KUNDE IST DA!
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                  {alert.customerName ?? 'Unbekannt'} ·{' '}
                  {new Date(alert.arrivedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </p>
              </div>
            </div>
            <button
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
              style={{
                background: 'none', border: 'none', color: '#4b5563',
                cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 0 0 8px',
              }}
            >
              ×
            </button>
          </div>

          {/* Plate */}
          <div style={{
            background: 'rgba(199,161,122,0.12)',
            border: '1px solid rgba(199,161,122,0.3)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 20,
            fontWeight: 900,
            color: '#f0f0f0',
            letterSpacing: '3px',
            fontFamily: 'monospace',
            textAlign: 'center',
          }}>
            {alert.plate ?? '—'}
          </div>

          {/* Location hint */}
          {alert.locationHint && (
            <div style={{
              marginTop: 8,
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#d1d5db',
            }}>
              <span>📍</span>
              <span>{alert.locationHint}</span>
            </div>
          )}

          {/* Order link */}
          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <a
              href={`/dashboard/project/${projectId}/orders`}
              style={{ fontSize: 11, color: '#C7A17A', textDecoration: 'underline' }}
            >
              Bestellung öffnen →
            </a>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes driveInSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
