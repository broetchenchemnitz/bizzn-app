'use client'

import { useState, useEffect } from 'react'

interface LoyaltyStats {
  active_participants: number
  total_balance_cents: number
}

interface LoyaltySettingsBlockProps {
  projectId: string
  initialEnabled: boolean
}

export default function LoyaltySettingsBlock({ projectId, initialEnabled }: LoyaltySettingsBlockProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState<LoyaltyStats | null>(null)

  useEffect(() => {
    // Statistik laden
    fetch(`/api/dashboard/loyalty/stats?projectId=${projectId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {})
  }, [projectId])

  async function handleToggle() {
    const newVal = !enabled
    setEnabled(newVal)
    setSaving(true)
    setSaved(false)

    const res = await fetch('/api/dashboard/loyalty/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, loyalty_enabled: newVal }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setEnabled(!newVal) // Rollback
    }
  }

  const totalBalanceEur = ((stats?.total_balance_cents ?? 0) / 100).toFixed(2)

  return (
    <div className="loyalty-settings-block">
      <div className="loyalty-header">
        <div className="loyalty-icon">🏆</div>
        <div>
          <h3 className="loyalty-title">Local-Hero Bonuskarte</h3>
          <p className="loyalty-subtitle">Automatische Kundenbindung — ohne App, ohne Aufwand</p>
        </div>
        <div className="loyalty-toggle-wrap">
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`loyalty-toggle ${enabled ? 'loyalty-toggle--on' : 'loyalty-toggle--off'}`}
            aria-label={enabled ? 'Deaktivieren' : 'Aktivieren'}
          >
            <span className="loyalty-toggle-knob" />
          </button>
          <span className="loyalty-toggle-label">{enabled ? 'Aktiv' : 'Inaktiv'}</span>
          {saving && <span className="loyalty-saving">…</span>}
          {saved && <span className="loyalty-saved">✓ Gespeichert</span>}
        </div>
      </div>

      <div className="loyalty-how-it-works">
        <h4>So funktioniert es</h4>
        <div className="loyalty-steps">
          <div className="loyalty-step">
            <span className="loyalty-step-num">1–5</span>
            <div>
              <strong>Guthaben aufbauen</strong>
              <p>Kunden sammeln bei jeder Bestellung automatisch <strong>10 %</strong> des Bestellwerts — ohne Registrierungsaufwand.</p>
            </div>
          </div>
          <div className="loyalty-step">
            <span className="loyalty-step-num">6.</span>
            <div>
              <strong>Automatische Einlösung</strong>
              <p>Bei der 6. Bestellung wird das gesamte Guthaben automatisch abgezogen. Kein manuelles Einlösen nötig.</p>
            </div>
          </div>
          <div className="loyalty-step">
            <span className="loyalty-step-num">90d</span>
            <div>
              <strong>Aktivitäts-Limit</strong>
              <p>Guthaben verfällt nach <strong>90 Tagen</strong> Inaktivität. Das motiviert regelmäßige Bestellungen.</p>
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="loyalty-stats">
          <div className="loyalty-stat">
            <span className="loyalty-stat-value">{stats.active_participants}</span>
            <span className="loyalty-stat-label">Aktive Teilnehmer</span>
          </div>
          <div className="loyalty-stat">
            <span className="loyalty-stat-value">{totalBalanceEur} €</span>
            <span className="loyalty-stat-label">Ausstehende Gutschriften</span>
          </div>
        </div>
      )}

      <style>{`
        .loyalty-settings-block {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 16px;
          padding: 24px;
          color: #e2e8f0;
          margin-bottom: 24px;
        }
        .loyalty-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .loyalty-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
        }
        .loyalty-title {
          margin: 0 0 4px;
          font-size: 1.2rem;
          font-weight: 700;
          color: #ffd700;
        }
        .loyalty-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #94a3b8;
        }
        .loyalty-toggle-wrap {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .loyalty-toggle {
          position: relative;
          width: 52px;
          height: 28px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: background 0.3s;
          padding: 0;
        }
        .loyalty-toggle--on { background: #10b981; }
        .loyalty-toggle--off { background: #475569; }
        .loyalty-toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          transition: transform 0.3s;
          display: block;
        }
        .loyalty-toggle--on .loyalty-toggle-knob { transform: translateX(24px); }
        .loyalty-toggle-label { font-size: 0.875rem; color: #94a3b8; }
        .loyalty-saving { font-size: 0.8rem; color: #94a3b8; }
        .loyalty-saved { font-size: 0.8rem; color: #10b981; font-weight: 600; }
        .loyalty-how-it-works h4 {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin: 0 0 16px;
        }
        .loyalty-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .loyalty-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          padding: 12px 16px;
        }
        .loyalty-step-num {
          background: rgba(255, 215, 0, 0.15);
          color: #ffd700;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .loyalty-step strong { display: block; margin-bottom: 2px; color: #f1f5f9; font-size: 0.95rem; }
        .loyalty-step p { margin: 0; font-size: 0.85rem; color: #94a3b8; }
        .loyalty-stats {
          display: flex;
          gap: 16px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .loyalty-stat {
          flex: 1;
          background: rgba(255, 215, 0, 0.07);
          border: 1px solid rgba(255, 215, 0, 0.15);
          border-radius: 10px;
          padding: 14px;
          text-align: center;
        }
        .loyalty-stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffd700;
        }
        .loyalty-stat-label {
          display: block;
          font-size: 0.78rem;
          color: #94a3b8;
          margin-top: 2px;
        }
      `}</style>
    </div>
  )
}
