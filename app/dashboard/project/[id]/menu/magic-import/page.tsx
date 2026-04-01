'use client';
import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

type ImportStatus = 'idle' | 'analyzing' | 'success' | 'error';

interface ImportResult {
  categoriesCreated: number;
  itemsCreated: number;
}

export default function MagicImportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const processFile = async (file: File) => {
    setFileName(file.name);
    setStatus('analyzing');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', params.id);

    try {
      const res = await fetch('/api/magic-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Unbekannter Fehler.');
        setStatus('error');
        return;
      }

      setResult({ categoriesCreated: data.categoriesCreated, itemsCreated: data.itemsCreated });
      setStatus('success');
    } catch {
      setErrorMsg('Netzwerkfehler. Bitte erneut versuchen.');
      setStatus('error');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const validFiles = Array.from(e.dataTransfer.files).filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        console.error(`QA-Block: Typ ${file.type} abgelehnt.`);
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      processFile(validFiles[0]);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(212,175,55,0.07),rgba(255,255,255,0))] text-gray-200 flex items-center justify-center p-6 antialiased selection:bg-[#D4AF37]/30">
      <div className="bg-[#0f0f0f]/90 backdrop-blur-2xl border border-white/[0.04] rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] ring-1 ring-white/[0.02] overflow-hidden transition-all duration-700 w-full max-w-2xl p-10 md:p-12">

        <div className="mb-10 text-center">
          <h2 className="text-[10px] text-[#D4AF37] font-bold tracking-[0.3em] uppercase mb-3 opacity-90">Menü-Digitalisierung</h2>
          <h1 className="text-3xl md:text-5xl font-extralight tracking-tighter text-white">Magic Import</h1>
        </div>

        {/* Hidden file input */}
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ── ANALYZING ── */}
        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center">
            <div className="relative w-12 h-12 mb-8">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-white/10"></div>
              <div className="absolute inset-0 rounded-full border-[1.5px] border-[#D4AF37] border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 animate-pulse blur-md"></div>
            </div>
            <p className="text-gray-300 font-light tracking-widest text-sm uppercase animate-pulse mb-2">
              Analysiere Speisekarte<span className="text-[#D4AF37]">...</span>
            </p>
            {fileName && (
              <p className="text-gray-600 text-xs mt-1 max-w-xs truncate">{fileName}</p>
            )}
          </div>
        )}

        {/* ── SUCCESS ── */}
        {status === 'success' && result && (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white text-lg font-light mb-1">Import erfolgreich</p>
            <p className="text-gray-500 text-sm mb-8">
              <span className="text-[#D4AF37] font-medium">{result.categoriesCreated}</span> Kategorien ·{' '}
              <span className="text-[#D4AF37] font-medium">{result.itemsCreated}</span> Gerichte angelegt
            </p>
            <button
              onClick={() => router.push(`/dashboard/project/${params.id}/menu`)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] text-sm font-medium hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all duration-300"
            >
              Zur Speisekarte →
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 text-sm mb-6 max-w-sm">{errorMsg}</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* ── IDLE DROP ZONE ── */}
        {status === 'idle' && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Datei hier ablegen oder zum Hochladen klicken"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`relative group border rounded-2xl p-14 text-center overflow-hidden transition duration-500 ease-out transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#77CC00] focus-visible:ring-offset-2 ${
              isDragActive
                ? 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.03] scale-[1.02] shadow-[inset_0_0_30px_rgba(212,175,55,0.05)]'
                : 'border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.02)]'
            }`}
          >
            <div className="text-white/20 group-hover:text-[#D4AF37] group-hover:-translate-y-2 group-hover:scale-110 transition-all duration-500 w-14 h-14 mx-auto mb-6 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <svg className="w-10 h-10 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-light tracking-wide">
              PDF oder Bild hier ablegen oder{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[#D4AF37] hover:text-white transition-colors duration-300 font-medium cursor-pointer ml-1 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-[#D4AF37] hover:after:bg-white after:transition-colors"
              >
                durchsuchen
              </button>
            </p>
            <p className="text-xs text-gray-700 mt-3">PDF, JPG, PNG · max. 20 MB</p>
          </div>
        )}

      </div>
    </div>
  );
}
