'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  UploadCloud,
  FileText,
  ImageIcon,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

interface ImportResult {
  categoriesCreated: number;
  itemsCreated: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ─── Component ────────────────────────────────────────────────────────────────
export default function MagicImportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Text tab state
  const [rawText, setRawText] = useState('');

  // File tab state
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('file');

  // ── File helpers ──────────────────────────────────────────────────────────
  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Nur PDF, JPEG, PNG oder WebP Dateien erlaubt.';
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `Datei zu groß. Maximal ${MAX_FILE_SIZE_MB} MB erlaubt.`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setStatus('error');
      setErrorMsg(err);
      return;
    }
    setFile(f);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Import: File (Gemini Vision) ──────────────────────────────────────────
  const handleFileImport = async () => {
    if (!file) return;

    setStatus('loading');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/magic-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import fehlgeschlagen');

      setResult({ categoriesCreated: data.categoriesCreated, itemsCreated: data.itemsCreated });
      setStatus('success');

      setTimeout(() => {
        router.push(`/dashboard/project/${projectId}/menu`);
        router.refresh();
      }, 2500);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler beim Import.');
    }
  };

  // ── Import: Text (AI text extraction) ────────────────────────────────────
  const handleTextImport = async () => {
    if (!rawText.trim()) return;

    setStatus('loading');
    setResult(null);

    try {
      const response = await fetch('/api/magic-import/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, projectId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import fehlgeschlagen');

      setResult({ categoriesCreated: data.categoriesCreated, itemsCreated: data.itemsCreated });
      setStatus('success');

      setTimeout(() => {
        router.push(`/dashboard/project/${projectId}/menu`);
        router.refresh();
      }, 2500);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler beim Import.');
    }
  };

  const isLoading = status === 'loading';
  const fileIconMap: Record<string, React.ReactNode> = {
    'application/pdf': <FileText className="w-8 h-8 text-[#C7A17A]" />,
    'image/jpeg': <ImageIcon className="w-8 h-8 text-[#C7A17A]" />,
    'image/png': <ImageIcon className="w-8 h-8 text-[#C7A17A]" />,
    'image/webp': <ImageIcon className="w-8 h-8 text-[#C7A17A]" />,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-[#1A1A1A] overflow-hidden">
      {/* Gold radial background glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(199,161,122,0.10) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          id="magic-import-back-btn"
          onClick={() => router.push(`/dashboard/project/${projectId}/menu`)}
          className="gap-2 text-gray-400 hover:text-[#C7A17A] hover:bg-[#C7A17A]/5 transition-all"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Speisekarte
        </Button>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tighter text-white flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#C7A17A]/15 border border-[#C7A17A]/25"
              aria-hidden="true"
            >
              <Sparkles className="w-5 h-5 text-[#C7A17A]" />
            </span>
            Magic AI Import
          </h1>
          <p className="text-gray-400 text-lg pl-1">
            Speisekarte hochladen — KI erledigt den Rest.
          </p>
        </div>

        {/* Main Card */}
        <div
          className="rounded-3xl border border-[#C7A17A]/15 bg-black/50 backdrop-blur-xl shadow-[0_0_60px_rgba(199,161,122,0.07)] p-6 sm:p-8 space-y-6"
          role="main"
        >
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as 'text' | 'file');
              setStatus('idle');
              setErrorMsg('');
            }}
            className="w-full"
          >
            <TabsList
              className="grid w-full grid-cols-2 mb-6 bg-white/5 border border-white/10 p-1 rounded-2xl"
              aria-label="Import-Methode wählen"
            >
              <TabsTrigger
                value="file"
                id="tab-file"
                className="rounded-xl text-sm font-semibold data-[state=active]:bg-[#C7A17A] data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
              >
                📄 PDF / Bild
              </TabsTrigger>
              <TabsTrigger
                value="text"
                id="tab-text"
                className="rounded-xl text-sm font-semibold data-[state=active]:bg-[#C7A17A] data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
              >
                ✏️ Text einfügen
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: File Upload ─────────────────────────────────────── */}
            <TabsContent value="file" className="space-y-5">
              {/* Drop zone */}
              <div
                id="magic-import-dropzone"
                role="button"
                tabIndex={0}
                aria-label="Datei hier ablegen oder klicken zum Auswählen"
                aria-describedby="dropzone-hint"
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isLoading)
                    fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`
                  relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
                  p-10 cursor-pointer transition-all duration-300 select-none outline-none
                  focus-visible:ring-2 focus-visible:ring-[#C7A17A]/50
                  ${dragOver
                    ? 'border-[#C7A17A] bg-[#C7A17A]/10 scale-[1.01]'
                    : file
                    ? 'border-[#C7A17A]/40 bg-[#C7A17A]/5'
                    : 'border-white/10 bg-white/2 hover:border-[#C7A17A]/30 hover:bg-[#C7A17A]/5'
                  }
                  ${isLoading ? 'pointer-events-none opacity-60' : ''}
                `}
              >
                {file ? (
                  <>
                    {fileIconMap[file.type] ?? <FileText className="w-8 h-8 text-[#C7A17A]" />}
                    <div className="text-center">
                      <p className="font-semibold text-white">{file.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Datei entfernen"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setStatus('idle');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-3 right-3 p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-[#C7A17A]/10 border border-[#C7A17A]/20 flex items-center justify-center transition-transform group-hover:scale-110">
                      <UploadCloud className="w-7 h-7 text-[#C7A17A]" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold">
                        {dragOver ? 'Jetzt loslassen!' : 'Datei hierher ziehen'}
                      </p>
                      <p id="dropzone-hint" className="text-gray-500 text-sm mt-1">
                        oder klicken zum Auswählen
                      </p>
                    </div>
                    <p className="text-xs text-gray-600">
                      PDF · JPEG · PNG · WebP — max. {MAX_FILE_SIZE_MB} MB
                    </p>
                  </>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                id="magic-import-file-input"
                accept=".pdf,image/jpeg,image/png,image/webp"
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              <Button
                id="magic-import-file-submit"
                onClick={handleFileImport}
                disabled={isLoading || !file}
                aria-busy={isLoading}
                className="w-full bg-[#C7A17A] hover:bg-[#B58E62] text-black font-extrabold py-6 text-base rounded-2xl transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(199,161,122,0.15)] hover:shadow-[0_0_30px_rgba(199,161,122,0.25)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    Gemini analysiert deine Speisekarte…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
                    Mit KI importieren
                  </>
                )}
              </Button>
            </TabsContent>

            {/* ── TAB: Text ─────────────────────────────────────────────── */}
            <TabsContent value="text" className="space-y-4">
              <Textarea
                id="magic-import-textarea"
                placeholder="Beispiel: Pizza Margherita — Tomaten, Mozzarella, Basilikum … 8,50 €&#10;Rinderfilet mit Trüffelbutter … 34,50 €"
                aria-label="Speisekarten-Text eingeben"
                className="min-h-[260px] bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A]/30 transition-colors rounded-2xl resize-none"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                disabled={isLoading}
              />

              <Button
                id="magic-import-text-submit"
                onClick={handleTextImport}
                disabled={isLoading || !rawText.trim()}
                aria-busy={isLoading}
                className="w-full bg-[#C7A17A] hover:bg-[#B58E62] text-black font-extrabold py-6 text-base rounded-2xl transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(199,161,122,0.15)] hover:shadow-[0_0_30px_rgba(199,161,122,0.25)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    Extrahiere Daten…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
                    Menü aus Text importieren
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {/* ── Status Messages ────────────────────────────────────────── */}
          {status === 'success' && result && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="p-4 rounded-2xl bg-[#C7A17A]/10 border border-[#C7A17A]/30 flex items-start gap-3 text-[#C7A17A] animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-base">Import erfolgreich! ✨</p>
                <p className="text-sm opacity-80 mt-0.5">
                  {result.categoriesCreated} Kategorie{result.categoriesCreated !== 1 ? 'n' : ''} &amp;{' '}
                  {result.itemsCreated} Gericht{result.itemsCreated !== 1 ? 'e' : ''} in dein Menü geladen.
                  Du wirst weitergeleitet…
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Import fehlgeschlagen</p>
                <p className="text-sm opacity-80 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Hint card */}
        <div className="rounded-2xl border border-white/5 bg-white/2 p-5 text-sm text-gray-500 space-y-2">
          <p className="font-semibold text-gray-400">💡 Tipps für den besten Import</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ein klares PDF oder Foto deiner Speisekarte liefert die besten Ergebnisse.</li>
            <li>Preise im Format &quot;8,50 €&quot; oder &quot;8.50&quot; werden automatisch erkannt.</li>
            <li>Nach dem Import kannst du alles im Menü-Manager korrigieren.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
