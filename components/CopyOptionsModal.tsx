'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Copy, Loader2, CheckCircle, Settings2 } from 'lucide-react'
import { getMenuItemsForProject, copyOptionGroupsToItem } from '@/app/actions/menu'

interface Props {
  projectId: string
  currentItemId: string
  currentItemName: string
  onClose: () => void
  onRefresh: () => void
}

export default function CopyOptionsModal({ projectId, currentItemId, currentItemName, onClose, onRefresh }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState<{ id: string; name: string; categoryName: string; hasOptions: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getMenuItemsForProject(projectId).then(result => {
      if (result.data) {
        // Aktuelles Item ausfiltern + nur Items mit Optionen anzeigen
        setItems(result.data.filter(i => i.id !== currentItemId && i.hasOptions))
      }
      setLoading(false)
    })
  }, [projectId, currentItemId])

  const handleCopy = () => {
    if (!selectedId) return
    startTransition(async () => {
      setError(null)
      const result = await copyOptionGroupsToItem(selectedId, currentItemId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        onRefresh()
        router.refresh()
        setTimeout(() => onClose(), 1200)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-gray-700 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-[#C7A17A]" />
            <h3 className="text-sm font-bold text-white">Optionen kopieren</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 mb-3">
            Wähle ein Gericht aus, von dem du die Optionsgruppen auf <span className="text-white font-semibold">&bdquo;{currentItemName}&ldquo;</span> kopieren möchtest.
            Bestehende Optionsgruppen bleiben erhalten.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Gerichte werden geladen…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Settings2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Keine anderen Gerichte mit Optionen gefunden.</p>
              <p className="text-xs text-gray-600 mt-1">Erstelle zuerst Optionsgruppen bei einem Gericht.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {/* Gruppiert nach Kategorie */}
              {(() => {
                const grouped = new Map<string, typeof items>()
                items.forEach(item => {
                  if (!grouped.has(item.categoryName)) grouped.set(item.categoryName, [])
                  grouped.get(item.categoryName)!.push(item)
                })
                return Array.from(grouped.entries()).map(([catName, catItems]) => (
                  <div key={catName}>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1 mb-1">{catName}</p>
                    {catItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                          selectedId === item.id
                            ? 'bg-[#C7A17A]/15 border border-[#C7A17A]/40'
                            : 'bg-[#242424] border border-transparent hover:border-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedId === item.id ? 'border-[#C7A17A] bg-[#C7A17A]' : 'border-gray-600'
                        }`}>
                          {selectedId === item.id && <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]" />}
                        </div>
                        <span className="text-xs text-white font-medium truncate">{item.name}</span>
                        <span className="text-[10px] text-[#C7A17A]/60 ml-auto flex-shrink-0">⚙️ Optionen</span>
                      </button>
                    ))}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>

        {/* Error / Success */}
        {error && (
          <div className="px-4 pb-2">
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 px-3 py-1.5 rounded-lg">{error}</p>
          </div>
        )}
        {success && (
          <div className="px-4 pb-2">
            <p className="text-xs text-green-400 bg-green-900/20 border border-green-900/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" /> Optionen erfolgreich kopiert!
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-800">
          <button onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg transition-all">
            Abbrechen
          </button>
          <button
            onClick={handleCopy}
            disabled={!selectedId || isPending || success}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a1a1a] bg-[#C7A17A] hover:bg-[#B58E62] px-4 py-1.5 rounded-lg transition-all disabled:opacity-40 shadow-[0_0_10px_rgba(199,161,122,0.2)]"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
            Kopieren
          </button>
        </div>
      </div>
    </div>
  )
}
