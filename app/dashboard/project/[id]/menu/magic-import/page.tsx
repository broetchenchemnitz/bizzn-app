'use client';
import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

type ImportStatus = 'idle' | 'analyzing' | 'success' | 'error';

interface ImportResult {
  categoriesCreated: number;
  itemsCreated: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function MagicImportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rejectedMsg, setRejectedMsg] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Dateityp „${file.type || file.name.split('.').pop()}" wird nicht unterstützt. Erlaubt: PDF, JPG, PNG.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Datei zu groß (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum: 10 MB.`;
    }
    return null;
  };

  const processFile = async (file: File) => {
    setRejectedMsg('');
    const validationError = validateFile(file);
    if (validationError) {
      setRejectedMsg(validationError);
      return;
    }

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
    setRejectedMsg('');

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => validateFile(file) === null);
    const rejectedFiles = files.filter((file) => validateFile(file) !== null);

    if (rejectedFiles.length > 0) {
      const error = validateFile(rejectedFiles[0]);
      setRejectedMsg(error ?? 'Eine oder mehrere Dateien wurden abgelehnt.');
    }

    if (validFiles.length > 0) {
      processFile(validFiles[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be reselected after rejection
    e.target.value = '';
    if (file) processFile(file);
  };

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(212,175,55,0.07),rgba(255,255,255,0))] text-gray-200 flex items-center justify-center p-6 antialiased selection:bg-[#D4AF37]/30">
      <div className="bg-[#0f0f0f]/90 backdrop-blur-2xl border border-white/[0.04] rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] ring-1 ring-white/[0.02] overflow-hidden transition-all duration-700 w-full max-w-2xl p-10 md:p-12">

        <div className="mb-10 text-center">
          <h2 className="text-[10px] text-[#C7A17A] font-bold tracking-[0.3em] uppercase mb-3 opacity-90">Menü-Digitalisierung</h2>
          <h1 className="text-3xl md:text-5xl font-extralight tracking-tighter text-white">Magic Import</h1>
        </div>

        {/* Hidden file input */}
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ── ANALYZING ── */}
        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center">
            <div className="relative w-12 h-12 mb-8">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-white/10"></div>
              <div className="absolute inset-0 rounded-full border-[1.5px] border-[#C7A17A] border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 rounded-full bg-[#C7A17A]/10 animate-pulse blur-md"></div>
            </div>
            <p className="text-gray-300 font-light tracking-widest text-sm uppercase animate-pulse mb-2">
              Analysiere Speisekarte<span className="text-[#C7A17A]">...</span>
            </p>
            {fileName && (
              <p className="text-gray-600 text-xs mt-1 max-w-xs truncate">{fileName}</p>
            )}
          </div>
        )}

        {/* ── SUCCESS ── */}
        {status === 'success' && result && (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center">
            <div className="w-14 h-14 rounded-full bg-[#C7A17A]/10 border border-[#C7A17A]/30 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-[#C7A17A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white text-lg font-light mb-1">Import erfolgreich</p>
            <p className="text-gray-500 text-sm mb-8">
              <span className="text-[#C7A17A] font-medium">{result.categoriesCreated}</span> Kategorien ·{' '}
              <span className="text-[#C7A17A] font-medium">{result.itemsCreated}</span> Gerichte angelegt
            </p>
            <button
              onClick={() => router.push(`/dashboard/project/${params.id}/menu`)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C7A17A]/10 border border-[#C7A17A]/25 text-[#C7A17A] text-sm font-medium hover:bg-[#C7A17A]/20 hover:border-[#C7A17A]/50 transition-all duration-300"
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
          <div className="flex flex-col gap-3">
            {/* Rejected file feedback */}
            {rejectedMsg && (
              <div
                id="file-error-msg"
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{rejectedMsg}</span>
              </div>
            )}

            {/* Semantic button dropzone */}
            <button
              type="button"
              aria-label="Datei hier ablegen oder zum Hochladen klicken"
              aria-invalid={rejectedMsg ? 'true' : 'false'}
              aria-describedby={rejectedMsg ? 'file-error-msg' : undefined}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative group w-full border rounded-2xl p-14 text-center overflow-hidden transition duration-500 ease-out transform-gpu outline-none focus-visible:ring-2 focus-visible:ring-[#C7A17A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f] ${
                isDragActive
                  ? 'border-[#C7A17A]/40 bg-[#C7A17A]/[0.03] scale-[1.02] shadow-[inset_0_0_30px_rgba(199,161,122,0.05)]'
                  : 'border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.02)]'
              }`}
            >
              <div className="text-white/20 group-hover:text-[#C7A17A] group-hover:-translate-y-2 group-hover:scale-110 transition-all duration-500 w-14 h-14 mx-auto mb-6 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[#C7A17A]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <svg className="w-10 h-10 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-light tracking-wide">
                PDF oder Bild hier ablegen oder{' '}
                <span className="text-[#C7A17A] font-medium relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-[#C7A17A]">
                  durchsuchen
                </span>
              </p>
              <p className="text-xs text-gray-700 mt-3">PDF, JPG, PNG · max. 10 MB</p>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
