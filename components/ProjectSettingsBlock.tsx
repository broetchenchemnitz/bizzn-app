"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2, Check, X } from 'lucide-react'
import { updateProjectName, deleteProject } from '@/app/actions/project'

export default function ProjectSettingsBlock({
  projectId,
  initialName,
  dangerZoneOnly = false,
}: {
  projectId: string
  initialName: string
  dangerZoneOnly?: boolean
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRename = async () => {
    if (name.trim() === '' || name === initialName) {
      setIsEditing(false)
      setName(initialName)
      return
    }

    setIsSaving(true)
    setError(null)
    const result = await updateProjectName(projectId, name)
    setIsSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      setIsEditing(false)
      router.refresh()
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    const result = await deleteProject(projectId)
    
    if (result.error) {
      setError(result.error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="w-full">
      {error && <div className="mb-3 p-3 bg-red-950 text-red-400 rounded-lg text-xs border border-red-900">{error}</div>}

      {/* Rename Block — nur wenn nicht dangerZoneOnly */}
      {!dangerZoneOnly && (
        <div className="flex items-center justify-between">
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="text-xl font-bold text-white border border-[#444444] bg-[#1A1A1A] rounded-lg px-3 py-1 outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] max-w-[260px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') { setIsEditing(false); setName(initialName) }
                  }}
                  disabled={isSaving}
                />
                <button onClick={handleRename} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => { setIsEditing(false); setName(initialName) }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" disabled={isSaving}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tighter text-white">{initialName}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-700 hover:text-[#C7A17A] hover:bg-[#242424] rounded-md transition-colors"
                  title="Betrieb umbenennen"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete trigger — compact text link */}
      {showDeleteConfirm ? (
        <div className="mt-4 p-4 bg-red-950 border border-red-900 rounded-xl">
          <h3 className="text-red-400 font-semibold text-sm mb-1">Betrieb unwiderruflich löschen?</h3>
          <p className="text-red-600 text-xs mb-3">
            Bist du sicher, dass du &quot;{initialName}&quot; löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-70"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Ja, löschen
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="bg-[#242424] text-gray-400 border border-[#333333] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#2d2d2d] transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mt-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Betrieb löschen
          </button>
        </div>
      )}
    </div>
  )
}
