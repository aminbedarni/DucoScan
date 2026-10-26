import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crop as CropIcon,
  Download,
  FileText,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { Adjustments, FilterId, Language, QuadCorners, ScannedDocument, ScannedPage } from '../types';
import { rotateCanvas } from '../utils/cv';
import { applyFilterToCanvas } from '../utils/filters';
import { recognizeTextFromImage } from '../utils/ocr';
import { saveDocument } from '../utils/storage';
import { CropAdjuster } from './CropAdjuster';
import { ExportModal } from './ExportModal';
import { FilterGallery } from './FilterGallery';

interface DocumentEditorProps {
  initialDocument: ScannedDocument;
  onBack: () => void;
  onOpenScannerForMorePages?: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  initialDocument,
  onBack,
  onOpenScannerForMorePages,
}) => {
  const { t, language } = useI18n();

  const [currentDoc, setCurrentDoc] = useState<ScannedDocument>(initialDocument);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [title, setTitle] = useState<string>(initialDocument.title);

  // Active sub-tool panel: 'filters' | 'adjust' | 'ocr' | null
  const [activePanel, setActivePanel] = useState<'filters' | 'adjust' | 'ocr'>('filters');

  // Interactive crop modal state
  const [isCropping, setIsCropping] = useState<boolean>(false);

  // Export modal state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // OCR state
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusMsg, setOcrStatusMsg] = useState<string>('');
  const [ocrLang, setOcrLang] = useState<Language>(language);
  const [copiedOcr, setCopiedOcr] = useState<boolean>(false);

  // Notification toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Canvas element cache for filter preview generation
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ScannedDocument[]>([initialDocument]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentPage = currentDoc.pages[currentPageIndex] || currentDoc.pages[0];

  const pushHistory = (newDoc: ScannedDocument) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newDoc);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setCurrentDoc(newDoc);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentDoc(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentDoc(next);
    }
  };

  // Convert croppedImage into an offscreen canvas and reapply filter + adjustments
  useEffect(() => {
    if (!currentPage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = window.document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setActiveCanvas(canvas);
      }
    };
    img.src = currentPage.croppedImage;
  }, [currentPage?.croppedImage, currentPage?.rotation]);

  // Re-run filter and adjustment pipeline on current page
  const updateCurrentPage = (
    updater: (p: ScannedPage) => Partial<ScannedPage>,
    addToHistory = true
  ) => {
    if (!currentPage || !activeCanvas) return;

    const updatedPages = [...currentDoc.pages];
    const targetPage = { ...currentPage, ...updater(currentPage) };

    // Render new processedImage
    const filteredCanvas = applyFilterToCanvas(
      activeCanvas,
      targetPage.filter,
      targetPage.filterIntensity,
      targetPage.adjustments
    );

    targetPage.processedImage = filteredCanvas.toDataURL('image/jpeg', 0.95);
    updatedPages[currentPageIndex] = targetPage;

    const updatedDoc: ScannedDocument = {
      ...currentDoc,
      pages: updatedPages,
      thumbnail: updatedPages[0].processedImage,
    };

    if (addToHistory) {
      pushHistory(updatedDoc);
    } else {
      setCurrentDoc(updatedDoc);
    }
  };

  // 1. Filter selection
  const handleSelectFilter = (filterId: FilterId) => {
    updateCurrentPage((p) => ({ filter: filterId }));
  };

  // 2. Filter intensity change
  const handleChangeIntensity = (intensity: number) => {
    updateCurrentPage((p) => ({ filterIntensity: intensity }), false);
  };

  // 3. Manual adjustments change
  const handleAdjustmentChange = (key: keyof Adjustments, value: number) => {
    updateCurrentPage(
      (p) => ({
        adjustments: { ...p.adjustments, [key]: value },
      }),
      false
    );
  };

  const handleResetAdjustments = () => {
    updateCurrentPage(() => ({
      adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
    }));
  };

  // 4. Rotation
  const handleRotate = (degrees: number) => {
    if (!currentPage || !activeCanvas) return;
    const rotated = rotateCanvas(activeCanvas, degrees);
    const newCroppedUrl = rotated.toDataURL('image/jpeg', 0.95);

    const filtered = applyFilterToCanvas(
      rotated,
      currentPage.filter,
      currentPage.filterIntensity,
      currentPage.adjustments
    );
    const newProcessedUrl = filtered.toDataURL('image/jpeg', 0.95);

    const updatedPages = [...currentDoc.pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      croppedImage: newCroppedUrl,
      processedImage: newProcessedUrl,
      thumbnail: newProcessedUrl,
      rotation: (currentPage.rotation + degrees) % 360,
      width: rotated.width,
      height: rotated.height,
    };

    setActiveCanvas(rotated);
    pushHistory({
      ...currentDoc,
      pages: updatedPages,
      thumbnail: updatedPages[0].processedImage,
    });
  };

  // 5. Crop & Perspective apply
  const handleApplyCrop = (croppedUrl: string, appliedCorners: QuadCorners) => {
    setIsCropping(false);
    if (!currentPage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = window.document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      setActiveCanvas(canvas);

      const filtered = applyFilterToCanvas(
        canvas,
        currentPage.filter,
        currentPage.filterIntensity,
        currentPage.adjustments
      );
      const processedUrl = filtered.toDataURL('image/jpeg', 0.95);

      const updatedPages = [...currentDoc.pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        croppedImage: croppedUrl,
        processedImage: processedUrl,
        thumbnail: processedUrl,
        corners: appliedCorners,
        width: canvas.width,
        height: canvas.height,
      };

      pushHistory({
        ...currentDoc,
        pages: updatedPages,
        thumbnail: updatedPages[0].processedImage,
      });
    };
    img.src = croppedUrl;
  };

  // 6. Revert to original raw scan
  const handleRevertOriginal = () => {
    if (!currentPage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = window.document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      setActiveCanvas(canvas);

      const updatedPages = [...currentDoc.pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        croppedImage: currentPage.originalImage,
        processedImage: currentPage.originalImage,
        thumbnail: currentPage.originalImage,
        filter: 'original',
        filterIntensity: 100,
        adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
        rotation: 0,
      };

      pushHistory({
        ...currentDoc,
        pages: updatedPages,
        thumbnail: updatedPages[0].processedImage,
      });
      showToast(t('revertOriginal'));
    };
    img.src = currentPage.originalImage;
  };

  // 7. Delete page
  const handleDeletePage = () => {
    if (currentDoc.pages.length <= 1) {
      alert('A document must have at least one page.');
      return;
    }
    if (confirm(t('confirmDeletePage'))) {
      const updatedPages = currentDoc.pages.filter((_, idx) => idx !== currentPageIndex);
      const newIndex = Math.max(0, currentPageIndex - 1);
      setCurrentPageIndex(newIndex);
      pushHistory({
        ...currentDoc,
        pages: updatedPages,
        thumbnail: updatedPages[0].processedImage,
      });
    }
  };

  // 8. Reorder page
  const handleMovePage = (dir: 'left' | 'right') => {
    const targetIdx = dir === 'left' ? currentPageIndex - 1 : currentPageIndex + 1;
    if (targetIdx < 0 || targetIdx >= currentDoc.pages.length) return;

    const updatedPages = [...currentDoc.pages];
    const temp = updatedPages[currentPageIndex];
    updatedPages[currentPageIndex] = updatedPages[targetIdx];
    updatedPages[targetIdx] = temp;

    setCurrentPageIndex(targetIdx);
    pushHistory({
      ...currentDoc,
      pages: updatedPages,
      thumbnail: updatedPages[0].processedImage,
    });
  };

  // 9. Run OCR
  const handleRunOcr = async () => {
    if (!currentPage) return;
    setIsOcrRunning(true);
    setOcrProgress(5);
    setOcrStatusMsg(t('ocrProcessing'));

    try {
      const result = await recognizeTextFromImage(
        currentPage.processedImage,
        ocrLang,
        (progress, status) => {
          setOcrProgress(progress);
          setOcrStatusMsg(status);
        }
      );

      const updatedPages = [...currentDoc.pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        ocrText: result.text,
        ocrLanguage: ocrLang,
      };

      pushHistory({
        ...currentDoc,
        pages: updatedPages,
      });

      setIsOcrRunning(false);
      showToast(t('success'));
    } catch (err) {
      console.error('OCR failed', err);
      setIsOcrRunning(false);
    }
  };

  // 10. Save to storage
  const handleSave = async () => {
    try {
      const toSave: ScannedDocument = {
        ...currentDoc,
        title: title.trim() || t('appName'),
        updatedAt: Date.now(),
      };
      await saveDocument(toSave);
      showToast(t('documentSaved'));
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const copyOcrToClipboard = () => {
    if (currentPage?.ocrText) {
      navigator.clipboard.writeText(currentPage.ocrText);
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-900 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top-4">
          {toastMsg}
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 pt-safe">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label={t('back')}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-cyan-500 focus:outline-none max-w-[150px] sm:max-w-xs text-slate-900 dark:text-white truncate px-1"
            placeholder="Document Title"
          />
        </div>

        {/* Action icons right */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition"
            aria-label={t('undo')}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition"
            aria-label={t('redo')}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition"
          >
            <Save className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">{t('save')}</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-900/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportDocument')}</span>
          </button>
        </div>
      </div>

      {/* Main Document Preview Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-3 overflow-hidden bg-slate-950">
        {currentPage && (
          <div className="relative max-h-full max-w-full flex items-center justify-center">
            <img
              src={currentPage.processedImage}
              alt={`Page ${currentPageIndex + 1}`}
              className="max-h-[58vh] max-w-full object-contain rounded-md shadow-2xl border border-slate-800"
            />

            {/* Page number badge */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 pointer-events-none">
              {t('pageNOfM', { current: currentPageIndex + 1, total: currentDoc.pages.length })}
            </div>
          </div>
        )}

        {/* Floating Quick Action buttons (Rotate & Crop) */}
        <div className="absolute right-3 top-3 flex flex-col gap-2 z-20">
          <button
            onClick={() => handleRotate(-90)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg transition"
            title={t('rotateLeft')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleRotate(90)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg transition"
            title={t('rotateRight')}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCropping(true)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-center text-cyan-400 hover:bg-slate-800 shadow-lg transition"
            title={t('crop')}
          >
            <CropIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Multi-Page Carousel Strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800/80 overflow-x-auto shrink-0 no-scrollbar">
        {currentDoc.pages.map((page, idx) => (
          <button
            key={page.id}
            onClick={() => setCurrentPageIndex(idx)}
            className={`relative shrink-0 w-12 h-16 rounded-md overflow-hidden border-2 transition ${
              currentPageIndex === idx
                ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                : 'border-slate-300 dark:border-slate-800 opacity-60 hover:opacity-100'
            }`}
          >
            <img src={page.thumbnail} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-mono text-center text-white py-0.5">
              {idx + 1}
            </span>
          </button>
        ))}

        {/* Add more pages button */}
        {onOpenScannerForMorePages && (
          <button
            onClick={onOpenScannerForMorePages}
            className="shrink-0 w-12 h-16 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex flex-col items-center justify-center gap-1 transition"
            title={t('addPage')}
          >
            <Plus className="w-4 h-4" />
            <span className="text-[9px]">{t('addPage')}</span>
          </button>
        )}

        {/* Page management tools (move left, right, delete) */}
        {currentDoc.pages.length > 1 && (
          <div className="flex items-center gap-1 ml-auto shrink-0 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleMovePage('left')}
              disabled={currentPageIndex === 0}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
              title={t('moveLeft')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleMovePage('right')}
              disabled={currentPageIndex === currentDoc.pages.length - 1}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
              title={t('moveRight')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeletePage}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
              title={t('deletePage')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tool Tabs Switcher: Filters | Adjust | OCR */}
      <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <button
          onClick={() => setActivePanel('filters')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activePanel === 'filters'
              ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>{t('filters')}</span>
        </button>

        <button
          onClick={() => setActivePanel('adjust')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activePanel === 'adjust'
              ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{t('adjust')}</span>
        </button>

        <button
          onClick={() => setActivePanel('ocr')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activePanel === 'ocr'
              ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t('ocr')}</span>
        </button>
      </div>

      {/* Sub-Panel: 30 Filters Gallery */}
      {activePanel === 'filters' && currentPage && (
        <FilterGallery
          currentFilter={currentPage.filter}
          filterIntensity={currentPage.filterIntensity}
          previewCanvasSource={activeCanvas}
          onSelectFilter={handleSelectFilter}
          onChangeIntensity={handleChangeIntensity}
        />
      )}

      {/* Sub-Panel: Manual Adjustments */}
      {activePanel === 'adjust' && currentPage && (
        <div className="p-3 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-2.5 pb-safe">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">{t('adjust')}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRevertOriginal}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                {t('revertOriginal')}
              </button>
              <button
                onClick={handleResetAdjustments}
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                {t('resetAdjustments')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {/* Brightness */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                <span>{t('brightness')}</span>
                <span className="font-mono">{currentPage.adjustments.brightness}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={currentPage.adjustments.brightness}
                onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                <span>{t('contrast')}</span>
                <span className="font-mono">{currentPage.adjustments.contrast}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={currentPage.adjustments.contrast}
                onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                <span>{t('saturation')}</span>
                <span className="font-mono">{currentPage.adjustments.saturation}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={currentPage.adjustments.saturation}
                onChange={(e) => handleAdjustmentChange('saturation', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Sharpness */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                <span>{t('sharpness')}</span>
                <span className="font-mono">{currentPage.adjustments.sharpness}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={currentPage.adjustments.sharpness}
                onChange={(e) => handleAdjustmentChange('sharpness', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Panel: OCR Recognition */}
      {activePanel === 'ocr' && currentPage && (
        <div className="p-3 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-3 max-h-48 overflow-y-auto pb-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">{t('ocrTitle')}</span>
              <select
                value={ocrLang}
                onChange={(e) => setOcrLang(e.target.value as Language)}
                className="text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="en">English (eng)</option>
                <option value="fr">Français (fra)</option>
                <option value="ar">العربية (ara)</option>
              </select>
            </div>

            <button
              onClick={handleRunOcr}
              disabled={isOcrRunning}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isOcrRunning ? `${ocrProgress}%` : t('runOcr')}</span>
            </button>
          </div>

          {/* OCR text display & copy */}
          {currentPage.ocrText ? (
            <div className="relative p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={copyOcrToClipboard}
                className="absolute top-2 right-2 p-1.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center gap-1 transition"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedOcr ? t('textCopied') : t('copyText')}</span>
              </button>
              <p
                className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed pr-16 max-h-24 overflow-y-auto"
                dir={currentPage.ocrLanguage === 'ar' ? 'rtl' : 'ltr'}
              >
                {currentPage.ocrText}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-2">
              {isOcrRunning ? ocrStatusMsg : t('noTextRecognized')}
            </p>
          )}
        </div>
      )}

      {/* 4-Corner Crop Modal */}
      {isCropping && currentPage && (
        <CropAdjuster
          imageSrc={currentPage.originalImage}
          initialCorners={currentPage.corners}
          onApplyCrop={handleApplyCrop}
          onCancel={() => setIsCropping(false)}
        />
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          document={currentDoc}
          currentPageIndex={currentPageIndex}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
};
