'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Eye, Settings, Globe, Store, QrCode, Users, MonitorPlay } from 'lucide-react'
import Link from 'next/link'

/**
 * Sidebar project-specific links — shown only when inside a /dashboard/project/[id] route.
 * Includes: Vorschau (external), Einstellungen, Web-Adresse, Bestellkanäle.
 */
export default function SidebarPreviewLink() {
  const pathname = usePathname()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [previewHref, setPreviewHref] = useState<string | null>(null)

  useEffect(() => {
    const match = pathname.match(/\/dashboard\/project\/([^/]+)/)
    if (!match) {
      setProjectId(null)
      setSlug(null)
      setPreviewHref(null)
      return
    }

    const id = match[1]
    setProjectId(id)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    fetch(
      `${supabaseUrl}/rest/v1/projects?id=eq.${id}&select=slug`,
      {
        headers: {
          apikey: anonKey ?? '',
          Authorization: `Bearer ${anonKey ?? ''}`,
        },
      }
    )
      .then((r) => r.json())
      .then((data: { slug: string | null }[]) => {
        const s = data?.[0]?.slug
        if (s) {
          setSlug(s)
          const port = window.location.port
          const portSuffix = port ? `:${port}` : ''
          setPreviewHref(`http://${s}.localhost${portSuffix}`)
        } else {
          setSlug(null)
          setPreviewHref(null)
        }
      })
      .catch(() => {
        setSlug(null)
        setPreviewHref(null)
      })
  }, [pathname])

  if (!projectId) return null

  const isActive = (path: string) => pathname.startsWith(path)

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-150 font-medium text-sm ${
      active
        ? 'bg-[#C7A17A]/15 text-[#C7A17A]'
        : 'text-gray-400 hover:bg-[#C7A17A]/10 hover:text-[#C7A17A]'
    }`

  return (
    <>
      {/* Divider with label */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Betrieb</p>
      </div>

      {/* Projekt-Übersicht */}
      <Link
        id="nav-project-overview"
        href={`/dashboard/project/${projectId}`}
        className={linkCls(pathname === `/dashboard/project/${projectId}`)}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Übersicht
      </Link>

      {/* Küchen-Display — öffnet in neuem Tab */}
      <a
        id="nav-kitchen-display"
        href={`/dashboard/project/${projectId}/kitchen`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkCls(false)}
      >
        <MonitorPlay className="w-4 h-4 flex-shrink-0" />
        Küchen-Display
        <svg
          className="w-3 h-3 ml-auto opacity-40"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>

      {/* Vorschau — external link */}
      {previewHref && (
        <a
          id="nav-preview"
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkCls(false)}
          title={`Storefront öffnen: ${slug}.bizzn.de`}
        >
          <Eye className="w-4 h-4 flex-shrink-0" />
          Vorschau
          <svg
            className="w-3 h-3 ml-auto opacity-40 group-hover:opacity-80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}

      {/* Einstellungen */}
      <Link
        id="nav-project-settings"
        href={`/dashboard/project/${projectId}/settings`}
        className={linkCls(isActive(`/dashboard/project/${projectId}/settings`))}
      >
        <Settings className="w-4 h-4 flex-shrink-0" />
        Einstellungen
      </Link>

      {/* QR-Codes — jetzt in Einstellungen → Vor Ort integriert */}
      <Link
        id="nav-project-qrcodes"
        href={`/dashboard/project/${projectId}/settings`}
        className={linkCls(isActive(`/dashboard/project/${projectId}/qr-codes`))}
      >
        <QrCode className="w-4 h-4 flex-shrink-0" />
        QR-Codes
      </Link>

      {/* Kunden */}
      <Link
        id="nav-project-customers"
        href={`/dashboard/project/${projectId}/customers`}
        className={linkCls(isActive(`/dashboard/project/${projectId}/customers`))}
      >
        <Users className="w-4 h-4 flex-shrink-0" />
        Kunden
      </Link>

      {/* Web-Adresse — shows slug or placeholder */}
      <Link
        id="nav-project-webaddress"
        href={`/dashboard/project/${projectId}/settings`}
        className={linkCls(false) + ' group'}
      >
        <Globe className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 min-w-0 truncate">
          {slug ? (
            <span className="font-mono text-xs">{slug}.bizzn.de</span>
          ) : (
            <span className="text-gray-600 text-xs italic">Web-Adresse setzen</span>
          )}
        </span>
      </Link>
    </>
  )
}
