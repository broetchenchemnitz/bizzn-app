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
  Link2,
  ChevronDown,
  ChevronRight,
  Globe,
  Package,
  Check,
  Minus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ImportStatus = 'idle' | 'loading' | 'success' | 'error';
type UrlScanPhase = 'idle' | 'scraping' | 'analyzing' | 'done' | 'error';

interface ImportResult {
  categoriesCreated: number;
  itemsCreated: number;
  optionGroupsCreated?: number;
  optionsCreated?: number;
  imagesDownloaded?: number;
}

interface PreviewOption {
  name: string;
  priceCents: number;
}

interface PreviewOptionGroup {
  name: string;
  isRequired: boolean;
  maxSelect: number;
  options: PreviewOption[];
}

interface PreviewItem {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  optionGroups: PreviewOptionGroup[];
  selected: boolean; // for checkbox
}

interface PreviewCategory {
  name: string;
  items: PreviewItem[];
  expanded: boolean;
  selected: boolean; // all items selected?
}

interface UrlPreviewData {
  platform: string;
  platformName: string;
  sourceUrl: string;
  categories: PreviewCategory[];
  stats: { categories: number; items: number; options: number; images: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ─── Platform SVG Logos ───────────────────────────────────────────────────────
function LieferandoLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FF8000" />
      <path d="M7 8h10v2H7zM7 11h8v2H7zM7 14h6v2H7z" fill="white" />
    </svg>
  );
}

function WoltLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#009DE0" />
      <path d="M5 16L8 8l4 5 4-5 3 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function UberEatsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#06C167" />
      <path d="M6 9h3v6H6zM10.5 9H14l2 3-2 3h-3.5z" fill="white" />
    </svg>
  );
}

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

  // URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [urlScanPhase, setUrlScanPhase] = useState<UrlScanPhase>('idle');
  const [urlPreview, setUrlPreview] = useState<UrlPreviewData | null>(null);
  const [urlImporting, setUrlImporting] = useState(false);

  // Shared state
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'url'>('url');

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

  // ── URL Scan (Browserless + Gemini) ──────────────────────────────────────
  const handleUrlScan = async () => {
    if (!urlInput.trim()) return;

    setUrlScanPhase('scraping');
    setUrlPreview(null);
    setStatus('idle');
    setErrorMsg('');

    // Simulate phase transition after 1.5s for UX (actual work happens in the fetch)
    const phaseTimer = setTimeout(() => setUrlScanPhase('analyzing'), 3000);

    try {
      const response = await fetch('/api/menu/url-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim(), projectId }),
      });

      clearTimeout(phaseTimer);
      const data = await response.json();

      if (!response.ok) {
        setUrlScanPhase('error');
        const errText = data.error || 'Scan fehlgeschlagen';
        // If fallback suggested and error doesn't already contain a tip, append one
        if (data.fallback && !errText.includes('Foto-Import') && !errText.includes('PDF / Bild')) {
          setErrorMsg(errText + '\n\n💡 Tipp: Mache stattdessen einen Screenshot der Speisekarte und nutze den Foto-Import.');
        } else {
          setErrorMsg(errText);
        }
        return;
      }

      // Transform into preview state with selection/expansion
      const previewCategories: PreviewCategory[] = (data.categories ?? []).map(
        (cat: { name: string; items: Array<{ name: string; description?: string; price: number; imageUrl?: string; optionGroups?: PreviewOptionGroup[] }> }) => ({
          name: cat.name,
          expanded: false,
          selected: true,
          items: (cat.items ?? []).map((item) => ({
            ...item,
            optionGroups: item.optionGroups ?? [],
            selected: true,
          })),
        })
      );

      setUrlPreview({
        platform: data.platform,
        platformName: data.platformName,
        sourceUrl: data.sourceUrl,
        categories: previewCategories,
        stats: data.stats,
      });
      setUrlScanPhase('done');
    } catch (err) {
      clearTimeout(phaseTimer);
      setUrlScanPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Scannen.');
    }
  };

  // ── URL Import Confirm ──────────────────────────────────────────────────
  const handleUrlConfirmImport = async () => {
    if (!urlPreview) return;

    setUrlImporting(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const response = await fetch('/api/menu/url-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          categories: urlPreview.categories,
          sourceUrl: urlPreview.sourceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import fehlgeschlagen');

      setResult({
        categoriesCreated: data.categoriesCreated,
        itemsCreated: data.itemsCreated,
        optionGroupsCreated: data.optionGroupsCreated,
        optionsCreated: data.optionsCreated,
        imagesDownloaded: data.imagesDownloaded,
      });
      setStatus('success');

      setTimeout(() => {
        router.push(`/dashboard/project/${projectId}/menu`);
        router.refresh();
      }, 3000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Import.');
    } finally {
      setUrlImporting(false);
    }
  };

  // ── Preview helpers ──────────────────────────────────────────────────────
  const toggleCategoryExpanded = (catIndex: number) => {
    if (!urlPreview) return;
    const updated = [...urlPreview.categories];
    updated[catIndex] = { ...updated[catIndex], expanded: !updated[catIndex].expanded };
    setUrlPreview({ ...urlPreview, categories: updated });
  };

  const toggleCategorySelected = (catIndex: number) => {
    if (!urlPreview) return;
    const updated = [...urlPreview.categories];
    const cat = updated[catIndex];
    const newSelected = !cat.selected;
    updated[catIndex] = {
      ...cat,
      selected: newSelected,
      items: cat.items.map((item) => ({ ...item, selected: newSelected })),
    };
    setUrlPreview({ ...urlPreview, categories: updated });
  };

  const toggleItemSelected = (catIndex: number, itemIndex: number) => {
    if (!urlPreview) return;
    const updated = [...urlPreview.categories];
    const cat = { ...updated[catIndex] };
    const items = [...cat.items];
    items[itemIndex] = { ...items[itemIndex], selected: !items[itemIndex].selected };
    cat.items = items;
    // Update category selection state
    const allSelected = items.every((i) => i.selected);
    const noneSelected = items.every((i) => !i.selected);
    cat.selected = allSelected;
    updated[catIndex] = cat;
    setUrlPreview({ ...urlPreview, categories: updated });
  };

  const toggleAllSelected = () => {
    if (!urlPreview) return;
    const allCurrentlySelected = urlPreview.categories.every((cat) =>
      cat.items.every((item) => item.selected)
    );
    const newState = !allCurrentlySelected;
    const updated = urlPreview.categories.map((cat) => ({
      ...cat,
      selected: newState,
      items: cat.items.map((item) => ({ ...item, selected: newState })),
    }));
    setUrlPreview({ ...urlPreview, categories: updated });
  };

  const selectedItemCount = urlPreview
    ? urlPreview.categories.reduce(
        (sum, cat) => sum + cat.items.filter((i) => i.selected).length,
        0
      )
    : 0;

  const totalItemCount = urlPreview
    ? urlPreview.categories.reduce((sum, cat) => sum + cat.items.length, 0)
    : 0;

  const isLoading = status === 'loading';
  const fileIconMap: Record<string, React.ReactNode> = {
    'application/pdf': <FileText className="w-8 h-8 text-[#C7A17A]" />,
    'image/jpeg': <ImageIcon className="w-8 h-8 text-[#C7A17A]" />,
    'image/png': <ImageIcon className="w-8 h-8 text-[#C7A17A]" />,
    'image/webp': <ImageIcon className="w-8 h-8 text-[#C7A17A]" />,
  };

  const formatPrice = (priceEuro: number) => {
    return priceEuro.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
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
          disabled={isLoading || urlImporting}
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
            Speisekarte importieren — KI erledigt den Rest.
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
              setActiveTab(v as 'file' | 'text' | 'url');
              setStatus('idle');
              setErrorMsg('');
            }}
            className="w-full"
          >
            <TabsList
              className="grid w-full grid-cols-3 mb-6 bg-white/5 border border-white/10 p-1 rounded-2xl"
              aria-label="Import-Methode wählen"
            >
              <TabsTrigger
                value="url"
                id="tab-url"
                className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-[#C7A17A] data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
              >
                🔗 URL importieren
              </TabsTrigger>
              <TabsTrigger
                value="file"
                id="tab-file"
                className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-[#C7A17A] data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
              >
                📄 PDF / Bild
              </TabsTrigger>
              <TabsTrigger
                value="text"
                id="tab-text"
                className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-[#C7A17A] data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
              >
                ✏️ Text
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: URL Import ────────────────────────────────────── */}
            <TabsContent value="url" className="space-y-5">
              {/* Platform badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500">Unterstützte Plattformen:</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-[#FF8000]/10 text-[#FF8000] text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#FF8000]/20">
                    <LieferandoLogo className="w-4 h-4" />
                    Lieferando
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-[#009DE0]/10 text-[#009DE0] text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#009DE0]/20">
                    <WoltLogo className="w-4 h-4" />
                    Wolt
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-[#06C167]/10 text-[#06C167] text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#06C167]/20">
                    <UberEatsLogo className="w-4 h-4" />
                    Uber Eats
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Auch andere Websites mit Speisekarte werden unterstützt.
              </p>

              {/* URL Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Globe className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="url"
                  id="magic-import-url-input"
                  placeholder="https://www.lieferando.de/speisekarte/dein-restaurant"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={urlScanPhase === 'scraping' || urlScanPhase === 'analyzing' || urlImporting}
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 text-white rounded-2xl placeholder:text-gray-600 focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A]/30 transition-colors text-sm disabled:opacity-60"
                />
              </div>

              {/* Scan Button / Progress */}
              {urlScanPhase === 'idle' || urlScanPhase === 'error' ? (
                <Button
                  id="magic-import-url-scan"
                  onClick={handleUrlScan}
                  disabled={!urlInput.trim()}
                  className="w-full bg-[#C7A17A] hover:bg-[#B58E62] text-black font-extrabold py-6 text-base rounded-2xl transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(199,161,122,0.15)] hover:shadow-[0_0_30px_rgba(199,161,122,0.25)]"
                >
                  <Link2 className="mr-2 h-5 w-5" />
                  Speisekarte scannen
                </Button>
              ) : urlScanPhase === 'scraping' || urlScanPhase === 'analyzing' ? (
                <div className="space-y-4">
                  {/* Progress Steps */}
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
                    {/* Step 1: Scraping */}
                    <div className="flex items-center gap-3">
                      {urlScanPhase === 'scraping' ? (
                        <div className="w-6 h-6 rounded-full bg-[#C7A17A]/20 flex items-center justify-center animate-pulse">
                          <Loader2 className="w-4 h-4 text-[#C7A17A] animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#C7A17A]/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-[#C7A17A]" />
                        </div>
                      )}
                      <span className={`text-sm font-medium ${urlScanPhase === 'scraping' ? 'text-white' : 'text-gray-400'}`}>
                        🌐 Seite wird geladen…
                      </span>
                    </div>

                    {/* Step 2: Analyzing */}
                    <div className="flex items-center gap-3">
                      {urlScanPhase === 'analyzing' ? (
                        <div className="w-6 h-6 rounded-full bg-[#C7A17A]/20 flex items-center justify-center animate-pulse">
                          <Loader2 className="w-4 h-4 text-[#C7A17A] animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-gray-600" />
                        </div>
                      )}
                      <span className={`text-sm font-medium ${urlScanPhase === 'analyzing' ? 'text-white' : 'text-gray-600'}`}>
                        🤖 KI analysiert Speisekarte…
                      </span>
                    </div>

                    {/* Step 3: Done (not yet) */}
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        ✅ Vorschau erstellen
                      </span>
                    </div>
                  </div>

                  <p className="text-center text-xs text-gray-500 animate-pulse">
                    Das dauert ca. 10–20 Sekunden…
                  </p>
                </div>
              ) : null}

              {/* ── Preview Table (after scan) ──────────────────────── */}
              {urlScanPhase === 'done' && urlPreview && !result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Stats banner */}
                  <div className="rounded-2xl bg-[#C7A17A]/10 border border-[#C7A17A]/25 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#C7A17A] shrink-0" />
                      <span className="font-bold text-[#C7A17A]">Scan erfolgreich!</span>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                      <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg">
                        {urlPreview.stats.categories} Kategorien
                      </span>
                      <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg">
                        {urlPreview.stats.items} Gerichte
                      </span>
                      {urlPreview.stats.options > 0 && (
                        <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg">
                          {urlPreview.stats.options} Optionen
                        </span>
                      )}
                      {urlPreview.stats.images > 0 && (
                        <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg">
                          📸 {urlPreview.stats.images} Bilder
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Select all toggle */}
                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={toggleAllSelected}
                      className="text-xs text-gray-400 hover:text-[#C7A17A] transition-colors underline underline-offset-2"
                    >
                      {selectedItemCount === totalItemCount ? 'Alle abwählen' : 'Alle auswählen'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {selectedItemCount} / {totalItemCount} ausgewählt
                    </span>
                  </div>

                  {/* Categories accordion */}
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto rounded-2xl">
                    {urlPreview.categories.map((cat, catIdx) => {
                      const selectedInCat = cat.items.filter((i) => i.selected).length;
                      const isPartial = selectedInCat > 0 && selectedInCat < cat.items.length;

                      return (
                        <div
                          key={catIdx}
                          className="rounded-xl border border-white/8 bg-white/3 overflow-hidden"
                        >
                          {/* Category header */}
                          <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategorySelected(catIdx);
                              }}
                              className={`
                                w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                                ${cat.selected
                                  ? 'bg-[#C7A17A] border-[#C7A17A]'
                                  : isPartial
                                  ? 'bg-[#C7A17A]/30 border-[#C7A17A]/50'
                                  : 'border-gray-600 hover:border-gray-400'
                                }
                              `}
                              aria-label={`Kategorie ${cat.name} auswählen`}
                            >
                              {cat.selected ? (
                                <Check className="w-3 h-3 text-black" />
                              ) : isPartial ? (
                                <Minus className="w-3 h-3 text-black" />
                              ) : null}
                            </button>

                            {/* Expand/collapse */}
                            <button
                              type="button"
                              onClick={() => toggleCategoryExpanded(catIdx)}
                              className="flex-1 flex items-center gap-2 text-left min-w-0"
                            >
                              {cat.expanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                              )}
                              <span className="font-semibold text-white text-sm truncate">
                                {cat.name}
                              </span>
                              <span className="text-xs text-gray-500 shrink-0">
                                {selectedInCat}/{cat.items.length}
                              </span>
                            </button>
                          </div>

                          {/* Items (expanded) */}
                          {cat.expanded && (
                            <div className="border-t border-white/5">
                              {cat.items.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className={`
                                    flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-b-0
                                    transition-all cursor-pointer hover:bg-white/3
                                    ${!item.selected ? 'opacity-40' : ''}
                                  `}
                                  onClick={() => toggleItemSelected(catIdx, itemIdx)}
                                >
                                  {/* Checkbox */}
                                  <button
                                    type="button"
                                    className={`
                                      w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all
                                      ${item.selected
                                        ? 'bg-[#C7A17A] border-[#C7A17A]'
                                        : 'border-gray-600'
                                      }
                                    `}
                                    aria-label={`${item.name} auswählen`}
                                  >
                                    {item.selected && <Check className="w-2.5 h-2.5 text-black" />}
                                  </button>

                                  {/* Item info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-sm text-white font-medium truncate">
                                        {item.name}
                                      </span>
                                      {item.price > 0 && (
                                        <span className="text-xs text-[#C7A17A] font-semibold shrink-0">
                                          {formatPrice(item.price)}
                                        </span>
                                      )}
                                    </div>
                                    {item.description && (
                                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                        {item.description}
                                      </p>
                                    )}
                                    {item.optionGroups.length > 0 && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Package className="w-3 h-3 text-gray-600" />
                                        <span className="text-[10px] text-gray-600">
                                          {item.optionGroups.length} Optionsgruppe{item.optionGroups.length !== 1 ? 'n' : ''}
                                          {' · '}
                                          {item.optionGroups.reduce((s, g) => s + g.options.length, 0)} Optionen
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Image indicator */}
                                  {item.imageUrl && (
                                    <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                                      📸
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Import button */}
                  <Button
                    id="magic-import-url-confirm"
                    onClick={handleUrlConfirmImport}
                    disabled={selectedItemCount === 0 || urlImporting}
                    className="w-full bg-[#C7A17A] hover:bg-[#B58E62] text-black font-extrabold py-6 text-base rounded-2xl transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(199,161,122,0.15)] hover:shadow-[0_0_30px_rgba(199,161,122,0.25)]"
                  >
                    {urlImporting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Importiere {selectedItemCount} Gerichte + Bilder…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {selectedItemCount} Gerichte importieren
                      </>
                    )}
                  </Button>

                  {/* Re-scan button */}
                  <button
                    type="button"
                    onClick={() => {
                      setUrlPreview(null);
                      setUrlScanPhase('idle');
                    }}
                    className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
                  >
                    ↻ Andere URL scannen
                  </button>
                </div>
              )}
            </TabsContent>

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
                  {result.itemsCreated} Gericht{result.itemsCreated !== 1 ? 'e' : ''}
                  {(result.optionGroupsCreated ?? 0) > 0 && (
                    <> &amp; {result.optionGroupsCreated} Optionsgruppe{result.optionGroupsCreated !== 1 ? 'n' : ''}</>
                  )}
                  {(result.imagesDownloaded ?? 0) > 0 && (
                    <> &amp; {result.imagesDownloaded} Bild{result.imagesDownloaded !== 1 ? 'er' : ''}</>
                  )}
                  {' '}in dein Menü geladen.
                  Du wirst weitergeleitet…
                </p>
              </div>
            </div>
          )}

          {status === 'error' && errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Import fehlgeschlagen</p>
                <p className="text-sm opacity-80 mt-0.5 whitespace-pre-line">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* URL scan error (separate from shared status) */}
          {urlScanPhase === 'error' && errorMsg && status !== 'error' && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Scan fehlgeschlagen</p>
                <p className="text-sm opacity-80 mt-0.5 whitespace-pre-line">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Hint card */}
        <div className="rounded-2xl border border-white/5 bg-white/2 p-5 text-sm text-gray-500 space-y-2">
          <p className="font-semibold text-gray-400">💡 Tipps für den besten Import</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>URL-Import:</strong> Kopiere die Speisekarten-URL von Lieferando, Wolt oder Uber Eats — die KI erkennt alle Gerichte, Preise und Optionen automatisch.</li>
            <li>Ein klares PDF oder Foto deiner Speisekarte liefert die besten Ergebnisse.</li>
            <li>Preise im Format &quot;8,50 €&quot; oder &quot;8.50&quot; werden automatisch erkannt.</li>
            <li>Nach dem Import kannst du alles im Menü-Manager korrigieren.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
