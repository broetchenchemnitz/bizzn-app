'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronUp, ChevronDown, Plus, Trash2, Loader2, Settings2,
  GripVertical, Star, StarOff
} from 'lucide-react'
import {
  updateOptionGroup, deleteOptionGroup, createOption, updateOption, deleteOption,
  reorderOptionGroups, reorderOptions,
  type OptionGroupWithOptions
} from '@/app/actions/menu'

interface Props {
  group: OptionGroupWithOptions
  allGroups: OptionGroupWithOptions[]
  menuItemId: string
  onRefresh: () => void
}

export default function MenuOptionGroupEditor({ group, allGroups, menuItemId, onRefresh }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingGroup, setEditingGroup] = useState(false)
  const [groupName, setGroupName] = useState(group.name)
  const [isRequired, setIsRequired] = useState(group.is_required)
  const [minSelect, setMinSelect] = useState(group.min_select)
  const [maxSelect, setMaxSelect] = useState(group.max_select)
  const [error, setError] = useState<string | null>(null)

  // Inline-Add für neue Option
  const [addingOption, setAddingOption] = useState(false)
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionPrice, setNewOptionPrice] = useState('')
  const [newOptionDefault, setNewOptionDefault] = useState(false)

  // Inline-Edit für existierende Option
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDefault, setEditDefault] = useState(false)

  const options = group.menu_options ?? []

  // ── Gruppen-Aktionen ──────────────────────────────────────────────────────

  const handleSaveGroup = () => {
    if (!groupName.trim()) return
    startTransition(async () => {
      setError(null)
      const result = await updateOptionGroup(group.id, {
        name: groupName.trim(),
        is_required: isRequired,
        min_select: minSelect,
        max_select: maxSelect,
      })
      if (result.error) setError(result.error)
      else { setEditingGroup(false); onRefresh(); router.refresh() }
    })
  }

  const handleDeleteGroup = () => {
    if (!confirm(`Optionsgruppe „${group.name}" wirklich löschen? Alle zugehörigen Optionen werden ebenfalls gelöscht.`)) return
    startTransition(async () => {
      const result = await deleteOptionGroup(group.id)
      if (result.error) setError(result.error)
      else { onRefresh(); router.refresh() }
    })
  }

  const handleMoveGroup = (direction: 'up' | 'down') => {
    const currentIdx = allGroups.findIndex(g => g.id === group.id)
    if (currentIdx < 0) return
    const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (swapIdx < 0 || swapIdx >= allGroups.length) return

    const newOrder = [...allGroups.map(g => g.id)]
    ;[newOrder[currentIdx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[currentIdx]]

    startTransition(async () => {
      await reorderOptionGroups(menuItemId, newOrder)
      onRefresh(); router.refresh()
    })
  }

  // ── Options-Aktionen ──────────────────────────────────────────────────────

  const handleAddOption = () => {
    if (!newOptionName.trim()) return
    const priceCents = Math.round(parseFloat(newOptionPrice.replace(',', '.') || '0') * 100)
    if (isNaN(priceCents) || priceCents < 0) { setError('Ungültiger Preis.'); return }

    startTransition(async () => {
      setError(null)
      const result = await createOption(group.id, {
        name: newOptionName.trim(),
        priceCents,
        isDefault: newOptionDefault,
      })
      if (result.error) setError(result.error)
      else {
        setNewOptionName(''); setNewOptionPrice(''); setNewOptionDefault(false)
        setAddingOption(false); onRefresh(); router.refresh()
      }
    })
  }

  const startEditOption = (opt: typeof options[0]) => {
    setEditingOptionId(opt.id)
    setEditName(opt.name)
    setEditPrice((opt.price_cents / 100).toFixed(2))
    setEditDefault(opt.is_default)
  }

  const handleSaveOption = (optionId: string) => {
    if (!editName.trim()) return
    const priceCents = Math.round(parseFloat(editPrice.replace(',', '.') || '0') * 100)
    if (isNaN(priceCents) || priceCents < 0) { setError('Ungültiger Preis.'); return }

    startTransition(async () => {
      setError(null)
      const result = await updateOption(optionId, {
        name: editName.trim(),
        priceCents,
        isDefault: editDefault,
      })
      if (result.error) setError(result.error)
      else { setEditingOptionId(null); onRefresh(); router.refresh() }
    })
  }

  const handleDeleteOption = (optionId: string, optionName: string) => {
    if (!confirm(`Option „${optionName}" löschen?`)) return
    startTransition(async () => {
      const result = await deleteOption(optionId)
      if (result.error) setError(result.error)
      else { onRefresh(); router.refresh() }
    })
  }

  const handleMoveOption = (optionId: string, direction: 'up' | 'down') => {
    const ids = options.map(o => o.id)
    const idx = ids.indexOf(optionId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= ids.length) return
    ;[ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]]

    startTransition(async () => {
      await reorderOptions(group.id, ids)
      onRefresh(); router.refresh()
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const groupIdx = allGroups.findIndex(g => g.id === group.id)
  const isFirst = groupIdx === 0
  const isLast = groupIdx === allGroups.length - 1

  const selectLabel = isRequired
    ? (minSelect === maxSelect ? `genau ${minSelect}` : `${minSelect}–${maxSelect}`)
    : (maxSelect > 1 ? `bis zu ${maxSelect}` : 'optional')

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition-all ${isPending ? 'opacity-60' : ''} ${isRequired ? 'border-[#C7A17A]/40' : 'border-gray-700/50'}`}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#1f1f1f]">
        {/* Reorder Pfeile */}
        <div className="flex flex-col gap-0.5">
          <button onClick={() => handleMoveGroup('up')} disabled={isFirst || isPending}
            className="text-gray-600 hover:text-[#C7A17A] disabled:opacity-20 transition-colors p-0.5">
            <ChevronUp className="w-3 h-3" />
          </button>
          <button onClick={() => handleMoveGroup('down')} disabled={isLast || isPending}
            className="text-gray-600 hover:text-[#C7A17A] disabled:opacity-20 transition-colors p-0.5">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <GripVertical className="w-3.5 h-3.5 text-gray-600" />

        {/* Gruppenname + Info */}
        <div className="flex-1 min-w-0">
          {editingGroup ? (
            <input
              value={groupName} onChange={e => setGroupName(e.target.value)}
              className="w-full bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 rounded-lg px-2 py-1 text-sm text-white outline-none"
              autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveGroup(); if (e.key === 'Escape') setEditingGroup(false) }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate">{group.name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isRequired ? 'bg-[#C7A17A]/15 text-[#C7A17A]' : 'bg-gray-800 text-gray-500'}`}>
                {isRequired ? 'Pflicht' : 'Optional'} · {selectLabel}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditingGroup(!editingGroup); if (!editingGroup) { setGroupName(group.name); setIsRequired(group.is_required); setMinSelect(group.min_select); setMaxSelect(group.max_select) } }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#C7A17A] hover:bg-[#C7A17A]/10 transition-all">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDeleteGroup} disabled={isPending}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-40">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Group Edit Panel ──────────────────────────────────────── */}
      {editingGroup && (
        <div className="px-3 py-2.5 bg-[#181818] border-y border-gray-800 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <button type="button" onClick={() => setIsRequired(!isRequired)}
                className={`relative w-8 h-4 rounded-full transition-colors ${isRequired ? 'bg-[#C7A17A]' : 'bg-gray-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isRequired ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-xs text-gray-400">Pflichtauswahl</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Min:</span>
              <input type="number" min={0} max={20} value={minSelect} onChange={e => setMinSelect(parseInt(e.target.value) || 0)}
                className="w-12 bg-[#242424] border border-gray-700 rounded-lg px-2 py-1 text-xs text-white text-center outline-none focus:border-[#C7A17A]/60" />
              <span className="text-xs text-gray-500">Max:</span>
              <input type="number" min={1} max={20} value={maxSelect} onChange={e => setMaxSelect(parseInt(e.target.value) || 1)}
                className="w-12 bg-[#242424] border border-gray-700 rounded-lg px-2 py-1 text-xs text-white text-center outline-none focus:border-[#C7A17A]/60" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveGroup} disabled={isPending}
              className="text-xs font-semibold text-[#1a1a1a] bg-[#C7A17A] hover:bg-[#B58E62] px-3 py-1 rounded-lg transition-all disabled:opacity-40">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Speichern'}
            </button>
            <button onClick={() => setEditingGroup(false)}
              className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1 rounded-lg transition-all">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Optionen-Liste ────────────────────────────────────────── */}
      <div className="px-3 py-2 space-y-1">
        {options.length === 0 && (
          <p className="text-xs text-gray-600 italic py-1">Noch keine Optionen. Füge mindestens eine hinzu.</p>
        )}

        {options.map((opt, idx) => (
          <div key={opt.id} className="group flex items-center gap-1.5 py-1 border-b border-gray-800/50 last:border-0">
            {/* Reorder */}
            <div className="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleMoveOption(opt.id, 'up')} disabled={idx === 0 || isPending}
                className="text-gray-600 hover:text-[#C7A17A] disabled:opacity-20 p-0.5">
                <ChevronUp className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => handleMoveOption(opt.id, 'down')} disabled={idx === options.length - 1 || isPending}
                className="text-gray-600 hover:text-[#C7A17A] disabled:opacity-20 p-0.5">
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>

            {editingOptionId === opt.id ? (
              /* Edit mode */
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name"
                  className="flex-1 min-w-[100px] bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 rounded-lg px-2 py-1 text-xs text-white outline-none" autoFocus />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">€</span>
                  <input value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="0.00"
                    className="w-20 bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 rounded-lg pl-5 pr-2 py-1 text-xs text-[#C7A17A] font-semibold outline-none" />
                </div>
                <button onClick={() => setEditDefault(!editDefault)} title={editDefault ? 'Standard-Auswahl' : 'Nicht vorausgewählt'}
                  className={`p-1 rounded ${editDefault ? 'text-[#C7A17A]' : 'text-gray-600'}`}>
                  {editDefault ? <Star className="w-3 h-3" /> : <StarOff className="w-3 h-3" />}
                </button>
                <button onClick={() => handleSaveOption(opt.id)} disabled={isPending}
                  className="text-xs font-semibold text-[#1a1a1a] bg-[#C7A17A] px-2 py-1 rounded-lg">✓</button>
                <button onClick={() => setEditingOptionId(null)}
                  className="text-xs text-gray-500 px-2 py-1">✕</button>
              </div>
            ) : (
              /* Display mode */
              <>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {opt.is_default && <Star className="w-3 h-3 text-[#C7A17A] flex-shrink-0" title="Standard" />}
                  <span className="text-xs text-gray-200 truncate">{opt.name}</span>
                  {opt.price_cents > 0 && (
                    <span className="text-xs text-[#C7A17A]/70 font-semibold whitespace-nowrap">
                      +{(opt.price_cents / 100).toFixed(2).replace('.', ',')} €
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditOption(opt)}
                    className="p-1 rounded text-gray-500 hover:text-[#C7A17A] transition-colors">
                    <Settings2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDeleteOption(opt.id, opt.name)} disabled={isPending}
                    className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Inline-Add */}
        {addingOption ? (
          <div className="flex items-center gap-2 py-1.5 flex-wrap">
            <input value={newOptionName} onChange={e => setNewOptionName(e.target.value)} placeholder="z.B. Extra Käse"
              className="flex-1 min-w-[100px] bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 rounded-lg px-2 py-1 text-xs text-white outline-none"
              autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAddOption(); if (e.key === 'Escape') setAddingOption(false) }} />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">€</span>
              <input value={newOptionPrice} onChange={e => setNewOptionPrice(e.target.value)} placeholder="0.00"
                className="w-20 bg-[#242424] border border-gray-700 focus:border-[#C7A17A]/60 rounded-lg pl-5 pr-2 py-1 text-xs text-[#C7A17A] font-semibold outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleAddOption() }} />
            </div>
            <button onClick={() => setNewOptionDefault(!newOptionDefault)} title={newOptionDefault ? 'Standard' : 'Nicht Standard'}
              className={`p-1 rounded ${newOptionDefault ? 'text-[#C7A17A]' : 'text-gray-600'}`}>
              {newOptionDefault ? <Star className="w-3 h-3" /> : <StarOff className="w-3 h-3" />}
            </button>
            <button onClick={handleAddOption} disabled={isPending || !newOptionName.trim()}
              className="text-xs font-semibold text-[#1a1a1a] bg-[#C7A17A] hover:bg-[#B58E62] px-2.5 py-1 rounded-lg disabled:opacity-40">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '+ Hinzufügen'}
            </button>
            <button onClick={() => { setAddingOption(false); setNewOptionName(''); setNewOptionPrice('') }}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">Abbrechen</button>
          </div>
        ) : (
          <button onClick={() => setAddingOption(true)} disabled={isPending}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#C7A17A] py-1 transition-colors disabled:opacity-40">
            <Plus className="w-3 h-3" /> Option hinzufügen
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 pb-2">
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 px-2 py-1 rounded-lg">{error}</p>
        </div>
      )}
    </div>
  )
}
