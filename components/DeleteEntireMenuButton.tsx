'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { deleteEntireMenu } from '@/app/actions/menu'
import { useRouter } from 'next/navigation'

interface DeleteEntireMenuButtonProps {
  projectId: string
  categoryCount: number
}

export default function DeleteEntireMenuButton({ projectId, categoryCount }: DeleteEntireMenuButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  if (categoryCount === 0) return null

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    const result = await deleteEntireMenu(projectId)
    if (result.error) {
      setError(result.error)
      setDeleting(false)
    } else {
      setShowConfirm(false)
      setDeleting(false)
      router.refresh()
    }
  }

  return (
    <>
      <button
        id="delete-entire-menu-btn"
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 text-xs text-red-400/60 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Gesamte Speisekarte löschen
      </button>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#242424] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Warning icon */}
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <h3 className="text-lg font-bold text-white text-center mb-2">
              Speisekarte löschen?
            </h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              Alle <strong className="text-white">{categoryCount} Kategorien</strong> mit allen Gerichten, Optionsgruppen und Optionen werden unwiderruflich gelöscht.
            </p>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-center">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setError(''); }}
                disabled={deleting}
                className="flex-1 py-3 text-sm font-semibold text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                id="confirm-delete-menu-btn"
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Lösche…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Alles löschen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
