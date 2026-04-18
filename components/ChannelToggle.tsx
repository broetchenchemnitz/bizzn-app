'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { updateProjectSettings } from '@/app/actions/project'

interface ChannelToggleProps {
  projectId: string
  field: string
  label: string
  description: string
  initialEnabled: boolean
}

export function ChannelToggle({ projectId, field, label, description, initialEnabled }: ChannelToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setSaved(false)
    startTransition(async () => {
      await updateProjectSettings(projectId, { [field]: next } as any)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="flex items-center justify-between mb-4 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex-1 mr-4">
        <p className="text-sm font-semibold text-gray-200">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {isPending && (
          <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
        )}
        {saved && !isPending && (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <button
          onClick={toggle}
          disabled={isPending}
          className="relative w-12 h-[26px] rounded-full border-none transition-colors duration-200"
          style={{
            background: enabled ? '#C7A17A' : 'rgba(255,255,255,0.1)',
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          <span
            className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-[left] duration-200"
            style={{ left: enabled ? '25px' : '3px' }}
          />
        </button>
      </div>
    </div>
  )
}
