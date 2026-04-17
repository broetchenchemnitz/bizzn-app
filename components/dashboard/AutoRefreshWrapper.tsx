"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AutoRefreshWrapperProps {
  children: React.ReactNode
  /** Refresh interval in milliseconds (default: 30 seconds) */
  intervalMs?: number
}

/**
 * Wraps children and periodically calls router.refresh()
 * to re-fetch server-side data (analytics, charts, etc.)
 * without a full page reload.
 */
export default function AutoRefreshWrapper({
  children,
  intervalMs = 30_000,
}: AutoRefreshWrapperProps) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [router, intervalMs])

  return <>{children}</>
}
