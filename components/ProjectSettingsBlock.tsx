"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2, Check, X, Layout } from 'lucide-react'
import { updateProjectName, deleteProject } from '@/app/actions/project'

export default function ProjectSettingsBlock({ projectId, initialName }: { projectId: string; initialName: string }) {
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
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>}
      
      <div className="flex items-start justify-between mb-8">
        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-lg px-3 py-1 outline-none focus:border-brand focus:ring-1 focus:ring-brand max-w-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') {
                    setIsEditing(false)
                    setName(initialName)
                  }
                }}
                disabled={isSaving}
              />
              <button 
                onClick={handleRename} 
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false)
                  setName(initialName)
                }} 
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                disabled={isSaving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{initialName}</h1>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-400 hover:text-brand hover:bg-gray-50 rounded-md transition-colors group"
                title="Projekt umbenennen"
              >
                <Pencil className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
          
          <div className="text-gray-500 mt-2 flex items-center gap-2">
            <span className="text-sm">Projekt-ID:</span>
            <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded-md text-gray-600 border border-gray-200">
              {projectId}
            </span>
          </div>
        </div>
        
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shadow-sm shrink-0">
          <Layout className="w-6 h-6 text-brand" />
        </div>
      </div>

      {showDeleteConfirm && (
         <div className="mb-0 p-6 bg-red-50 border border-red-200 rounded-xl relative">
            <h3 className="text-red-800 font-semibold mb-2">Projekt unwiderruflich löschen?</h3>
            <p className="text-red-600 text-sm mb-4">
               Bist du sicher, dass du das Projekt &quot;{initialName}&quot; löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
               <button 
                 onClick={handleDelete}
                 disabled={isDeleting}
                 className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
               >
                 {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                 Ja, Projekt endgültig löschen
               </button>
               <button 
                 onClick={() => setShowDeleteConfirm(false)}
                 disabled={isDeleting}
                 className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
               >
                 Abbrechen
               </button>
            </div>
         </div>
      )}

      {/* Trigger Delete Config */}
      {!showDeleteConfirm && (
        <div className="flex justify-end pt-4">
           <button 
             onClick={() => setShowDeleteConfirm(true)}
             className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-transparent hover:border-red-100"
           >
             <Trash2 className="w-4 h-4" />
             Projekt löschen
           </button>
        </div>
      )}
    </div>
  )
}
