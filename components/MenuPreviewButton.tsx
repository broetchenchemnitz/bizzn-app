'use client'

import { Eye, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

interface MenuPreviewButtonProps {
  slug: string
}

export default function MenuPreviewButton({ slug }: MenuPreviewButtonProps) {
  const [href, setHref] = useState<string>('')

  useEffect(() => {
    // Construct the local preview URL using the current browser port
    const port = window.location.port
    const portSuffix = port ? `:${port}` : ''
    setHref(`http://${slug}.localhost${portSuffix}`)
  }, [slug])

  if (!href) return null

  return (
    <a
      id="menu-preview-btn"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300 bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-700 hover:border-gray-600 hover:text-white transition-all duration-200 group"
      title={`Kunden-Ansicht öffnen: ${slug}.bizzn.de`}
    >
      <Eye className="w-4 h-4" />
      <span className="hidden sm:inline">Vorschau</span>
      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </a>
  )
}
