'use client'

import { useEffect, useState } from 'react'

interface PushSubscribeButtonProps {
  projectId: string
  slug: string
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type PushState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'idle'

export default function PushSubscribeButton({ projectId, slug }: PushSubscribeButtonProps) {
  const [state, setState] = useState<PushState>('loading')
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    // Prüfen ob bereits subscribiert
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setState(sub ? 'subscribed' : 'idle')
      })
    })
  }, [])

  async function handleSubscribe() {
    setIsSubscribing(true)
    try {
      // Service Worker registrieren
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // VAPID Public Key laden
      const keyRes = await fetch('/api/push/vapid-key')
      if (!keyRes.ok) {
        alert('Push-Benachrichtigungen sind momentan nicht verfügbar.')
        return
      }
      const { publicKey } = await keyRes.json()

      // Browser-Permission anfragen
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }

      // Push-Subscription erstellen
      const rawKey = urlBase64ToUint8Array(publicKey)
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey.buffer.slice(
          rawKey.byteOffset,
          rawKey.byteOffset + rawKey.byteLength
        ) as ArrayBuffer,
      })

      const sub = subscription.toJSON()
      const keys = sub.keys as { p256dh: string; auth: string }

      // Subscription im Backend speichern
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          projectId,
          slug,
        }),
      })

      setState('subscribed')
    } catch (err) {
      console.error('PushSubscribeButton error:', err)
    } finally {
      setIsSubscribing(false)
    }
  }

  if (state === 'loading' || state === 'unsupported') return null

  if (state === 'denied') {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Push-Benachrichtigungen im Browser deaktiviert
      </div>
    )
  }

  if (state === 'subscribed') {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#8a6542] font-medium">
        <svg className="w-3.5 h-3.5 text-[#C7A17A]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Benachrichtigungen aktiviert
      </div>
    )
  }

  return (
    <button
      id="btn-push-subscribe"
      onClick={handleSubscribe}
      disabled={isSubscribing}
      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#8a6542] hover:text-[#C7A17A] transition-colors disabled:opacity-60"
      aria-label="Push-Benachrichtigungen aktivieren"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {isSubscribing ? 'Wird aktiviert…' : '🔔 Angebote & Neuigkeiten per Push erhalten'}
    </button>
  )
}
