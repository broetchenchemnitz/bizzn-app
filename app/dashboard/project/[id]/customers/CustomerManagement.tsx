'use client'

import { useEffect, useState, useTransition } from 'react'
import { Users, Search, ShieldOff, ShieldAlert, ShieldCheck, Ban, CheckCircle, X, AlertTriangle } from 'lucide-react'
import {
  getCustomersForProject,
  banCustomer,
  unbanCustomer,
  unblockCashPayment,
  type CustomerDetail,
} from '@/app/actions/customer-management'

function eur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

// ---------------------------------------------------------------------------
// Bestätigungs-Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  confirmColor,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  message: string
  confirmText: string
  confirmColor: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#1e1e1e', border: '1px solid #333',
          borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '16px', margin: 0 }}>{title}</h3>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>{message}</p>
        {children}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px',
              background: '#2a2a2a', border: '1px solid #444', color: '#ccc',
              fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px',
              background: confirmColor, border: 'none', color: '#fff',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status-Badge
// ---------------------------------------------------------------------------

function StatusBadge({ customer }: { customer: CustomerDetail }) {
  if (customer.isBanned) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
        background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)',
      }}>
        <Ban className="w-3 h-3" /> Gesperrt
      </span>
    )
  }
  if (customer.isCashBlacklisted) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
        background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)',
      }}>
        <ShieldAlert className="w-3 h-3" /> Bar gesperrt
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
      background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)',
    }}>
      <CheckCircle className="w-3 h-3" /> Aktiv
    </span>
  )
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

export default function CustomerManagement({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const [customers, setCustomers] = useState<CustomerDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // Modals
  const [banModal, setBanModal] = useState<{ customer: CustomerDetail } | null>(null)
  const [unbanModal, setUnbanModal] = useState<{ customer: CustomerDetail } | null>(null)
  const [unblockModal, setUnblockModal] = useState<{ customer: CustomerDetail } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'banned' | 'cash_blocked' | 'active'>('all')

  // Kunden laden
  const loadCustomers = () => {
    setLoading(true)
    startTransition(async () => {
      const result = await getCustomersForProject(projectId)
      setCustomers(result.customers)
      setLoading(false)
    })
  }

  useEffect(() => { loadCustomers() }, [projectId])

  // Gefilterte Kunden
  const filtered = customers.filter(c => {
    // Status-Filter
    if (statusFilter === 'banned' && !c.isBanned) return false
    if (statusFilter === 'cash_blocked' && !c.isCashBlacklisted) return false
    if (statusFilter === 'active' && (c.isBanned || c.isCashBlacklisted)) return false
    // Suche
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false) ||
      `#${c.customerNumber}`.includes(q) ||
      `${c.customerNumber}`.includes(q)
    )
  })

  // Stats
  const bannedCount = customers.filter(c => c.isBanned).length
  const cashBlockedCount = customers.filter(c => c.isCashBlacklisted).length
  const activeCount = customers.filter(c => !c.isBanned && !c.isCashBlacklisted).length

  // Actions
  const handleBan = () => {
    if (!banModal) return
    setActionError(null)
    startTransition(async () => {
      const result = await banCustomer(projectId, banModal.customer.userId, banReason)
      if (result.success) {
        setBanModal(null)
        setBanReason('')
        loadCustomers()
      } else {
        setActionError(result.error ?? 'Fehler')
      }
    })
  }

  const handleUnban = () => {
    if (!unbanModal) return
    setActionError(null)
    startTransition(async () => {
      const result = await unbanCustomer(projectId, unbanModal.customer.userId)
      if (result.success) {
        setUnbanModal(null)
        loadCustomers()
      } else {
        setActionError(result.error ?? 'Fehler')
      }
    })
  }

  const handleUnblock = () => {
    if (!unblockModal) return
    setActionError(null)
    startTransition(async () => {
      const result = await unblockCashPayment(projectId, unblockModal.customer.userId)
      if (result.success) {
        setUnblockModal(null)
        loadCustomers()
      } else {
        setActionError(result.error ?? 'Fehler')
      }
    })
  }

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#C7A17A] mb-1">Kunden</h1>
        <p className="text-gray-400 text-sm">
          Kundenverwaltung für <span className="text-white font-medium">{projectName}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gesamt', value: customers.length, color: '#C7A17A' },
          { label: 'Aktiv', value: activeCount, color: '#34d399' },
          { label: 'Gesperrt', value: bannedCount, color: '#ef4444' },
          { label: 'Bar gesperrt', value: cashBlockedCount, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} className="bg-[#242424] border border-[#333333] rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Suche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-shrink-0">
          {[
            { key: 'all' as const, label: 'Alle' },
            { key: 'active' as const, label: 'Aktiv' },
            { key: 'banned' as const, label: 'Gesperrt' },
            { key: 'cash_blocked' as const, label: 'Bar gesperrt' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: statusFilter === f.key ? 'rgba(199,161,122,0.15)' : 'rgba(36,36,36,0.8)',
                border: `1px solid ${statusFilter === f.key ? 'rgba(199,161,122,0.4)' : '#333'}`,
                color: statusFilter === f.key ? '#C7A17A' : '#6b7280',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail, Telefonnummer oder Kundennummer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#242424] border border-[#333] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#C7A17A]/50 transition-colors"
          />
        </div>
      </div>

      {/* Tabelle */}
      <section className="bg-[#242424] border border-[#333333] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#333333]">
          <Users className="w-4 h-4 text-[#C7A17A]" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Kunden-Liste
          </h2>
          <span className="text-xs text-gray-600 ml-auto">
            {filtered.length} von {customers.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#C7A17A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-gray-700 mb-3" />
            <p className="text-gray-400 font-medium">
              {search ? 'Keine Kunden gefunden' : 'Noch keine Kunden registriert'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333333]">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Nr.</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Kunde</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Bestellungen</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Umsatz</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Bonuskarte</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.userId} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors">
                    {/* Kundennummer */}
                    <td className="px-4 py-3">
                      <span className="text-[#C7A17A] font-mono font-bold text-xs">#{c.customerNumber}</span>
                    </td>
                    {/* Kunde */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-white text-sm">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                        {c.phone && <p className="text-xs text-gray-500 font-mono">{c.phone}</p>}
                      </div>
                      {/* Andere Sperren anzeigen (anonymisiert) */}
                      {c.otherBans.filter(b => b.type === 'ban').length > 0 && (
                        <div className="mt-1">
                          {c.otherBans.filter(b => b.type === 'ban').map((b, i) => (
                            <p key={i} className="text-[10px] text-red-400/70">
                              ⚠️ Bei anderem Restaurant gesperrt — {b.reason}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* Bestellungen */}
                    <td className="px-3 py-3 text-center">
                      <p className="text-white font-bold">{c.orderCount}</p>
                      {c.lastOrderAt && (
                        <p className="text-[10px] text-gray-600">
                          Letzte: {new Date(c.lastOrderAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </td>
                    {/* Umsatz */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-[#C7A17A] font-bold text-sm">{eur(c.totalRevenueCents)}</span>
                    </td>
                    {/* Bonuskarte */}
                    <td className="px-3 py-3 text-center">
                      <p className="text-white font-semibold text-xs">{eur(c.loyaltyBalanceCents)}</p>
                      <p className="text-[10px] text-gray-600">{c.loyaltyOrderCount}/6</p>
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3 text-center">
                      <StatusBadge customer={c} />
                    </td>
                    {/* Aktionen */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {c.isCashBlacklisted && (
                          <button
                            title="Barzahlung entsperren"
                            onClick={() => setUnblockModal({ customer: c })}
                            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {c.isBanned ? (
                          <button
                            title="Kunde entsperren"
                            onClick={() => setUnbanModal({ customer: c })}
                            className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            title="Kunde sperren"
                            onClick={() => { setBanModal({ customer: c }); setBanReason('') }}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {/* Kunde sperren */}
      <ConfirmModal
        open={!!banModal}
        title="Kunde sperren"
        message={`Möchtest du "${banModal?.customer.name}" wirklich für ${projectName} sperren? Der Kunde kann dann keine Bestellungen mehr aufgeben.`}
        confirmText={isPending ? 'Wird gesperrt...' : 'Ja, sperren'}
        confirmColor="#ef4444"
        onConfirm={handleBan}
        onCancel={() => { setBanModal(null); setActionError(null) }}
      >
        <div style={{ marginBottom: '8px' }}>
          <label style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Grund der Sperrung *
          </label>
          <textarea
            value={banReason}
            onChange={e => setBanReason(e.target.value)}
            placeholder="z.B. Wiederholte No-Shows, Belästigung..."
            rows={2}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: '8px',
              background: '#2a2a2a', border: '1px solid #444', color: '#f0f0f0',
              fontSize: '12px', resize: 'none', outline: 'none',
            }}
          />
        </div>
        {actionError && (
          <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{actionError}</p>
        )}
      </ConfirmModal>

      {/* Kunde entsperren */}
      <ConfirmModal
        open={!!unbanModal}
        title="Kunde entsperren"
        message={`Möchtest du "${unbanModal?.customer.name}" wieder für ${projectName} freigeben?`}
        confirmText={isPending ? 'Wird entsperrt...' : 'Ja, entsperren'}
        confirmColor="#34d399"
        onConfirm={handleUnban}
        onCancel={() => { setUnbanModal(null); setActionError(null) }}
      >
        {unbanModal?.customer.banReason && (
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '8px' }}>
            <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>Grund der Sperrung:</p>
            <p style={{ color: '#ef4444', fontSize: '12px' }}>{unbanModal.customer.banReason}</p>
          </div>
        )}
        {actionError && (
          <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{actionError}</p>
        )}
      </ConfirmModal>

      {/* Barzahlung entsperren */}
      <ConfirmModal
        open={!!unblockModal}
        title="Barzahlung entsperren"
        message={`Möchtest du die Barzahlungs-Sperre für "${unblockModal?.customer.name}" aufheben?`}
        confirmText={isPending ? 'Wird entsperrt...' : 'Ja, entsperren'}
        confirmColor="#fbbf24"
        onConfirm={handleUnblock}
        onCancel={() => { setUnblockModal(null); setActionError(null) }}
      >
        {unblockModal?.customer.cashBlacklistReason && (
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: '8px' }}>
            <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>Grund der Sperre:</p>
            <p style={{ color: '#fbbf24', fontSize: '12px' }}>{unblockModal.customer.cashBlacklistReason}</p>
          </div>
        )}
        {actionError && (
          <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{actionError}</p>
        )}
      </ConfirmModal>
    </>
  )
}
