'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteProject } from '@/app/actions/delete-project'

interface Props {
  projectId: string
  projectName: string
  status: string
}

export function DeleteProjectButton({ projectId, projectName, status }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isActive = status === 'active'

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteProject(projectId)
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 border border-red-400/10 hover:border-red-400/30 px-3 py-2 rounded-lg transition-all"
        title="Betrieb löschen"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Löschen
      </button>

      {/* Confirmation Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            {/* Warning icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Betrieb löschen?</h3>
                <p className="text-gray-500 text-xs mt-0.5">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-300 font-medium">{projectName}</p>
              {isActive && (
                <p className="text-xs text-amber-400 mt-1">
                  ⚠️ Dieser Betrieb ist aktuell live. Kunden können ihn nach dem Löschen nicht mehr erreichen.
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isPending ? 'Wird gelöscht…' : 'Ja, löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
