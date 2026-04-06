'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, Plus, Minus, QrCode, ExternalLink, Copy, Check } from 'lucide-react'

interface QRCodeGeneratorProps {
  slug: string | null
  projectName: string
}

function buildUrl(slug: string, table: number | null, baseOrigin: string): string {
  const base = process.env.NODE_ENV === 'development'
    ? `${baseOrigin}`
    : `https://${slug}.bizzn.de`
  // Tisch-QR-Codes → direkt zur Speisekarte (Kiosk-Modus)
  const path = process.env.NODE_ENV === 'development'
    ? `/${slug}/menu`
    : `/menu`
  const params = new URLSearchParams()
  if (table !== null) params.set('table', String(table))
  params.set('mode', 'kiosk')
  return `${base}${path}?${params.toString()}`
}

interface TableQRProps {
  label: string
  url: string
  size?: number
}

function TableQRCard({ label, url, size = 200 }: TableQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: {
        dark: '#1A1A1A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }).catch(console.error)
  }, [url, size])

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qr-${label.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }, [label])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [url])

  return (
    <div
      id={`qr-card-${label.replace(/\s+/g, '-').toLowerCase()}`}
      className="bg-[#242424] rounded-2xl border border-white/5 p-5 flex flex-col items-center gap-4 hover:border-[#C7A17A]/30 transition-all duration-200 group"
    >
      {/* QR Canvas — wrapped in white bg for print contrast */}
      <div className="bg-white rounded-xl p-3 shadow-sm group-hover:shadow-[0_0_20px_rgba(199,161,122,0.15)] transition-shadow">
        <canvas ref={canvasRef} className="block" />
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="font-bold text-white text-sm">{label}</p>
        <p className="text-[11px] text-gray-600 mt-0.5 font-mono break-all leading-relaxed max-w-[200px]">
          {url.replace(/^https?:\/\//, '')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 w-full">
        <button
          onClick={handleDownload}
          title="PNG herunterladen"
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#C7A17A] hover:bg-[#B58E62] text-black text-xs font-bold py-2 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button
          onClick={handleCopy}
          title="URL kopieren"
          className="w-9 h-8 flex items-center justify-center rounded-lg border border-[#333333] hover:border-[#C7A17A] text-gray-400 hover:text-[#C7A17A] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Storefront öffnen"
          className="w-9 h-8 flex items-center justify-center rounded-lg border border-[#333333] hover:border-[#C7A17A] text-gray-400 hover:text-[#C7A17A] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}

export default function QRCodeGenerator({ slug, projectName }: QRCodeGeneratorProps) {
  const [tableCount, setTableCount] = useState(6)
  const [baseOrigin, setBaseOrigin] = useState('')
  const [activeTab, setActiveTab] = useState<'tables' | 'storefront'>('tables')

  useEffect(() => {
    setBaseOrigin(window.location.origin)
  }, [])

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1)

  const handlePrint = () => {
    window.print()
  }

  if (!slug) {
    return (
      <div className="bg-[#242424] rounded-2xl border border-white/5 p-10 text-center">
        <QrCode className="w-12 h-12 text-gray-700 mx-auto mb-4" />
        <p className="text-white font-semibold mb-2">Noch keine Web-Adresse gesetzt</p>
        <p className="text-gray-500 text-sm">
          Gehe zu <strong className="text-[#C7A17A]">Einstellungen → Web-Adresse</strong>, um einen Slug zu konfigurieren. Danach werden hier automatisch deine QR-Codes generiert.
        </p>
      </div>
    )
  }

  const storefrontUrl = process.env.NODE_ENV === 'development'
    ? `${baseOrigin}/${slug}`
    : `https://${slug}.bizzn.de`

  return (
    <div className="space-y-6">

      {/* Header Card */}
      <div className="bg-[#242424] rounded-2xl border border-white/5 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">QR-Code Generator</h2>
            <p className="text-sm text-gray-500">
              Generiere Tisch-QR-Codes für <span className="text-[#C7A17A] font-mono">{slug}.bizzn.de</span>.
              Deine Gäste scannen → Speisekarte öffnet sich → Bestellung läuft direkt in deine Küche.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#292929] border border-[#333333] hover:border-[#C7A17A] text-gray-300 hover:text-[#C7A17A] text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            Alle drucken
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-[#1A1A1A] rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'tables'
                ? 'bg-[#C7A17A] text-black shadow'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            🍽️ Tisch-QR-Codes
          </button>
          <button
            onClick={() => setActiveTab('storefront')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'storefront'
                ? 'bg-[#C7A17A] text-black shadow'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            🌐 Storefront-QR
          </button>
        </div>
      </div>

      {activeTab === 'tables' && (
        <>
          {/* Table count control */}
          <div className="bg-[#242424] rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white text-sm">Anzahl Tische</p>
              <p className="text-xs text-gray-600 mt-0.5">Jeder Tisch bekommt einen eigenen QR-Code mit Tisch-ID</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTableCount((n) => Math.max(1, n - 1))}
                disabled={tableCount <= 1}
                className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#333333] hover:border-[#C7A17A] text-gray-400 hover:text-[#C7A17A] flex items-center justify-center transition-all disabled:opacity-30"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-extrabold text-white w-8 text-center tabular-nums">
                {tableCount}
              </span>
              <button
                onClick={() => setTableCount((n) => Math.min(50, n + 1))}
                disabled={tableCount >= 50}
                className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#333333] hover:border-[#C7A17A] text-gray-400 hover:text-[#C7A17A] flex items-center justify-center transition-all disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* QR Grid */}
          {baseOrigin && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 print:grid-cols-4">
              {tables.map((table) => (
                <TableQRCard
                  key={table}
                  label={`Tisch ${table}`}
                  url={buildUrl(slug, table, baseOrigin)}
                  size={180}
                />
              ))}
            </div>
          )}

          {/* Print hint */}
          <p className="text-center text-xs text-gray-700">
            💡 Tipp: Laminiere die ausgedruckten QR-Codes und befestige sie an jedem Tisch — deine Gäste können sofort bestellen.
          </p>
        </>
      )}

      {activeTab === 'storefront' && (
        <div className="flex flex-col items-center gap-6">
          <div className="bg-[#242424] rounded-2xl border border-white/5 p-6 text-sm text-gray-400 max-w-md text-center">
            <p>Dieser QR-Code öffnet deine <strong className="text-white">allgemeine Speisekarte</strong> ohne Tisch-Zuordnung — ideal für Flyer, Schaufenster oder Visitenkarten.</p>
          </div>
          {baseOrigin && (
            <TableQRCard
              label={projectName}
              url={storefrontUrl}
              size={240}
            />
          )}
        </div>
      )}
    </div>
  )
}
