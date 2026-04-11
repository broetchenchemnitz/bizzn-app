import type { ReactNode } from 'react'

// Küchen-Monitor: überschreibt Dashboard-Shell via fixed-Positionierung
export default function KitchenLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      {children}
    </div>
  )
}
