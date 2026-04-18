'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { updateInStoreSettings } from '@/app/actions/project'
import { Loader2, CheckCircle, Plus, Minus, Download, Copy, Check, ExternalLink, Printer, QrCode } from 'lucide-react'

interface InStoreSettingsBlockProps {
  projectId: string
  initialEnabled: boolean
  slug: string | null
}

// ── QR Code helpers ──────────────────────────────────────────────────────────

function buildUrl(slug: string, table: number, baseOrigin: string): string {
  const base = process.env.NODE_ENV === 'development'
    ? `${baseOrigin}`
    : `https://${slug}.bizzn.de`
  const path = process.env.NODE_ENV === 'development'
    ? `/${slug}/menu`
    : `/menu`
  const params = new URLSearchParams()
  params.set('table', String(table))
  params.set('mode', 'kiosk')
  return `${base}${path}?${params.toString()}`
}

function TableQRCard({ label, url, size = 180 }: { label: string; url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const tableNum = label.replace(/^Tisch\s+/i, '')

  useEffect(() => {
    if (!canvasRef.current) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: size,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      }).catch(console.error)
    })
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
    <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4 flex flex-col items-center gap-2 hover:border-[#C7A17A]/30 transition-all group print:bg-white print:border-gray-200">
      <div className="text-center">
        <div className="text-2xl font-black text-white group-hover:text-[#C7A17A] transition-colors print:text-[#1A1A1A]">
          🪑 {tableNum}
        </div>
        <div className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold print:text-gray-400">Tisch</div>
      </div>
      <div className="bg-white rounded-lg p-2 shadow-sm">
        <canvas ref={canvasRef} className="block" />
      </div>
      <p className="text-[9px] text-gray-700 font-mono break-all leading-relaxed max-w-[170px] text-center">
        {url.replace(/^https?:\/\//, '')}
      </p>
      <div className="flex gap-1.5 w-full print:hidden">
        <button onClick={handleDownload} title="PNG herunterladen" className="flex-1 flex items-center justify-center gap-1 bg-[#C7A17A] hover:bg-[#B58E62] text-black text-[10px] font-bold py-1.5 rounded-lg transition-colors">
          <Download className="w-3 h-3" /> PNG
        </button>
        <button onClick={handleCopy} title="URL kopieren" className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#333333] hover:border-[#C7A17A] text-gray-500 hover:text-[#C7A17A] transition-colors">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" title="Öffnen" className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#333333] hover:border-[#C7A17A] text-gray-500 hover:text-[#C7A17A] transition-colors">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function InStoreSettingsBlock({ projectId, initialEnabled, slug }: InStoreSettingsBlockProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableCount, setTableCount] = useState(6)
  const [baseOrigin, setBaseOrigin] = useState('')

  useEffect(() => {
    setBaseOrigin(window.location.origin)
  }, [])

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setSaved(false)
    startTransition(async () => {
      const { error } = await updateInStoreSettings(projectId, next)
      if (error) { setError(error); setEnabled(!next) }
      else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    })
  }

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1)

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex-1 mr-4">
          <p className="text-sm font-semibold text-gray-200">Tischbestellungen aktivieren</p>
          <p className="text-xs text-gray-500">
            {enabled
              ? 'Gäste scannen den QR-Code am Tisch und bestellen direkt.'
              : 'Bestellungen vor Ort sind deaktiviert.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isPending && <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />}
          {saved && !isPending && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          <button
            onClick={handleToggle}
            disabled={isPending}
            className="relative w-12 h-[26px] rounded-full border-none transition-colors duration-200"
            style={{
              background: enabled ? '#C7A17A' : 'rgba(255,255,255,0.1)',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
            aria-pressed={enabled}
          >
            <span
              className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-[left] duration-200"
              style={{ left: enabled ? '25px' : '3px' }}
            />
          </button>
        </div>
      </div>

      {error && <span className="text-xs text-red-400">{error}</span>}

      {/* QR-Code Section — only when enabled + slug exists */}
      {enabled && (
        <div className={`space-y-4 transition-opacity ${!slug ? 'opacity-50' : ''}`}>
          {!slug ? (
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-6 text-center">
              <QrCode className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                Setze zuerst eine <strong className="text-[#C7A17A]">Web-Adresse</strong> unter "Storefront", um QR-Codes zu generieren.
              </p>
            </div>
          ) : (
            <>
              {/* Table count control */}
              <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[#1A1A1A] border border-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">Anzahl Tische</p>
                  <p className="text-[10px] text-gray-600">Jeder Tisch bekommt einen eigenen QR-Code</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTableCount(n => Math.max(1, n - 1))}
                    disabled={tableCount <= 1}
                    className="w-8 h-8 rounded-lg bg-[#242424] border border-[#333333] hover:border-[#C7A17A] text-gray-400 hover:text-[#C7A17A] flex items-center justify-center transition-all disabled:opacity-30"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xl font-extrabold text-white w-7 text-center tabular-nums">{tableCount}</span>
                  <button
                    onClick={() => setTableCount(n => Math.min(50, n + 1))}
                    disabled={tableCount >= 50}
                    className="w-8 h-8 rounded-lg bg-[#242424] border border-[#333333] hover:border-[#C7A17A] text-gray-400 hover:text-[#C7A17A] flex items-center justify-center transition-all disabled:opacity-30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Print button */}
              <div className="flex justify-end">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-[#1A1A1A] hover:bg-[#292929] border border-[#333333] hover:border-[#C7A17A] text-gray-400 hover:text-[#C7A17A] text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Alle drucken
                </button>
              </div>

              {/* QR Grid */}
              {baseOrigin && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4">
                  {tables.map(table => (
                    <TableQRCard
                      key={table}
                      label={`Tisch ${table}`}
                      url={buildUrl(slug, table, baseOrigin)}
                      size={160}
                    />
                  ))}
                </div>
              )}

              <p className="text-center text-[10px] text-gray-700">
                💡 Laminiere die QR-Codes und befestige sie an jedem Tisch — Gäste scannen und bestellen sofort.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
