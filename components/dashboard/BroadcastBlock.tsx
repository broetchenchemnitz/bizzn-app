'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

interface BroadcastBlockProps {
  projectId: string
}

const MAX_CHARS = 140

export default function BroadcastBlock({ projectId }: BroadcastBlockProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch(`/api/push/broadcast?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.count === 'number') setSubscriberCount(d.count)
      })
      .catch(() => null)
  }, [projectId])

  function handleSend() {
    if (!title.trim() || !message.trim()) {
      toast.error('Bitte Titel und Nachricht eingeben.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/push/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, title: title.trim(), message: message.trim() }),
        })
        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error ?? 'Broadcast fehlgeschlagen.')
          return
        }

        setLastResult({ sent: data.sent, failed: data.failed })
        toast.success(`📣 ${data.sent} Kunden benachrichtigt!`)
        setTitle('')
        setMessage('')
        // Subscriber-Anzahl aktualisieren (dead endpoints wurden bereinigt)
        setSubscriberCount((prev) =>
          prev !== null ? prev - (data.failed ?? 0) : prev
        )
      } catch {
        toast.error('Netzwerkfehler. Bitte erneut versuchen.')
      }
    })
  }

  const charsLeft = MAX_CHARS - message.length

  return (
    <div className="bg-[#242424] border border-[#333333] rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">📣</span> Broadcast
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Sende sofort eine Push-Nachricht an alle Kunden
          </p>
        </div>
        {subscriberCount !== null && (
          <div className="text-right">
            <span className="text-2xl font-black text-[#C7A17A]">{subscriberCount}</span>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Subscriber</p>
          </div>
        )}
      </div>

      {subscriberCount === 0 && (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
          <span>💡</span>
          <span>
            Noch keine Subscriber. Kunden können auf deiner Storefront Push-Benachrichtigungen aktivieren.
          </span>
        </div>
      )}

      {/* Titel */}
      <div>
        <label htmlFor="broadcast-title" className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
          Titel
        </label>
        <input
          id="broadcast-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Neue Mittagskarte 🍜"
          maxLength={60}
          className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600
            focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A]/40 transition-colors"
        />
      </div>

      {/* Nachricht */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="broadcast-message" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Nachricht
          </label>
          <span className={`text-xs tabular-nums ${charsLeft < 20 ? 'text-amber-400' : 'text-gray-500'}`}>
            {charsLeft} Zeichen
          </span>
        </div>
        <textarea
          id="broadcast-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
          placeholder="z. B. Heute: Frische Pasta, Schnitzel & mehr — nur bis 21 Uhr!"
          rows={3}
          className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none
            focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A]/40 transition-colors"
        />
      </div>

      {/* Letztes Ergebnis */}
      {lastResult && (
        <div className="flex items-center gap-3 text-xs text-gray-400 bg-[#1A1A1A] rounded-lg px-4 py-2.5">
          <span className="text-green-400 font-semibold">✓ {lastResult.sent} gesendet</span>
          {lastResult.failed > 0 && (
            <span className="text-gray-500">· {lastResult.failed} fehlgeschlagen (bereinigt)</span>
          )}
        </div>
      )}

      {/* Send Button */}
      <button
        id="btn-broadcast-send"
        onClick={handleSend}
        disabled={isPending || !title.trim() || !message.trim() || subscriberCount === 0}
        className="w-full flex items-center justify-center gap-2 bg-[#C7A17A] hover:bg-[#b8906a]
          disabled:opacity-40 disabled:cursor-not-allowed
          text-[#1A1A1A] font-bold text-sm py-3 px-6 rounded-xl
          transition-all duration-150 shadow-md hover:shadow-[#C7A17A]/20 hover:shadow-lg
          hover:-translate-y-0.5 active:translate-y-0"
      >
        {isPending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Wird gesendet…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            An alle {subscriberCount !== null && subscriberCount > 0 ? `${subscriberCount} Kunden` : 'Kunden'} senden
          </>
        )}
      </button>
    </div>
  )
}
