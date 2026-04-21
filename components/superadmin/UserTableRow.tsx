'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectPricingRow } from './ProjectPricingRow'

interface Project {
  id: string
  name: string
  status: string
  created_at: string
  slug: string
  custom_monthly_price_cents?: number | null
  trial_ends_at?: string | null
}

interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  banned_until: string | null
  projects: Project[]
}

interface UserRowProps {
  user: AdminUser
}

export function UserTableRow({ user }: UserRowProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const isSuspended = !!user.banned_until || user.projects.some(p => p.status === 'suspended')

  async function handleImpersonate() {
    setLoading('impersonate')
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const json = await res.json() as { link?: string; error?: string }
      if (json.link) {
        window.open(json.link, '_blank')
      } else {
        alert('Fehler: ' + (json.error ?? 'Unbekannt'))
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleSuspend() {
    const action = isSuspended ? 'entsperren' : 'sperren'
    if (!confirm(`User ${user.email} wirklich ${action}?`)) return
    setLoading('suspend')
    try {
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, suspend: !isSuspended }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (json.success) {
        router.refresh()
      } else {
        alert('Fehler: ' + (json.error ?? 'Unbekannt'))
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete() {
    if (!confirm(`⚠️ ACHTUNG: User ${user.email} und ALLE seine Betriebe unwiderruflich löschen?`)) return
    if (!confirm(`Bist du sicher? Dieser Schritt kann nicht rückgängig gemacht werden.`)) return
    setLoading('delete')
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (json.success) {
        router.refresh()
      } else {
        alert('Fehler: ' + (json.error ?? 'Unbekannt'))
      }
    } finally {
      setLoading(null)
    }
  }

  const btnBase = 'text-xs font-medium px-2.5 py-1.5 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <tr className="border-b border-[#1f1f1f] hover:bg-[#1a0a0a]/60 transition-colors group">
      {/* Email + Betriebe */}
      <td className="px-4 py-4">
        <a
          href={`/superadmin/user/${user.id}`}
          className="font-medium text-white hover:text-red-400 transition-colors"
        >
          {user.email}
        </a>
        <div className="mt-1 flex flex-col gap-2">
          {user.projects.length === 0 ? (
            <span className="text-xs text-gray-600">Keine Betriebe</span>
          ) : (
            user.projects.map(p => (
              <div key={p.id}>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    p.status === 'suspended'
                      ? 'bg-red-950 border-red-800 text-red-400'
                      : p.status === 'draft'
                      ? 'bg-amber-950/50 border-amber-800/50 text-amber-500'
                      : 'bg-[#1f1f1f] border-[#333] text-gray-400'
                  }`}
                >
                  {p.name}
                  <span className="ml-1 opacity-60">({p.status})</span>
                </span>
                {/* M31: Inline Pricing-Editor */}
                <ProjectPricingRow project={p} />
              </div>
            ))
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        {isSuspended ? (
          <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Gesperrt
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Aktiv
          </span>
        )}
      </td>

      {/* Registriert */}
      <td className="px-4 py-4 text-xs text-gray-500">
        {new Date(user.created_at).toLocaleDateString('de-DE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })}
      </td>

      {/* Letzter Login */}
      <td className="px-4 py-4 text-xs text-gray-500">
        {user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleDateString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })
          : '—'}
      </td>

      {/* Betriebe # */}
      <td className="px-4 py-4 text-center">
        <span className="text-sm font-bold text-gray-300">{user.projects.length}</span>
      </td>

      {/* Aktionen */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Detail */}
          <a
            href={`/superadmin/user/${user.id}`}
            className={`${btnBase} bg-[#222] border border-[#333] text-gray-300 hover:text-white hover:border-[#555]`}
          >
            🔍 Details
          </a>

          {/* Impersonate */}
          <button
            onClick={handleImpersonate}
            disabled={!!loading}
            className={`${btnBase} bg-indigo-950 border border-indigo-800 text-indigo-300 hover:bg-indigo-900 hover:text-white`}
          >
            {loading === 'impersonate' ? '…' : '👁️ Einloggen'}
          </button>

          {/* Suspend / Unsuspend */}
          <button
            onClick={handleSuspend}
            disabled={!!loading}
            className={`${btnBase} ${
              isSuspended
                ? 'bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-900'
                : 'bg-amber-950 border border-amber-800 text-amber-400 hover:bg-amber-900'
            }`}
          >
            {loading === 'suspend' ? '…' : isSuspended ? '✅ Entsperren' : '⛔ Sperren'}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={!!loading}
            className={`${btnBase} bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 hover:text-white`}
          >
            {loading === 'delete' ? '…' : '🗑️ Löschen'}
          </button>
        </div>
      </td>
    </tr>
  )
}
