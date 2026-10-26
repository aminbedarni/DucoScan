import React, { useRef } from 'react';
import {
  ArrowRight,
  Camera,
  FileCheck,
  FileText,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Moon,
  Plus,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useTheme } from '../theme/context';
import { Language, ScannedDocument, ScannedPage } from '../types';
import { getDefaultCorners, perspectiveWarp } from '../utils/cv';
import { createArabicSample, createContractSample, createReceiptSample } from '../utils/samples';
import { saveDocument } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeViewProps {
  recentDocuments: ScannedDocument[];
  onStartScan: () => void;
  onOpenDocument: (doc: ScannedDocument) => void;
  onViewAllDocuments: () => void;
  onRefreshData: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  recentDocuments,
  onStartScan,
  onOpenDocument,
  onViewAllDocuments,
  onRefreshData,
}) => {
  const { t, language, setLanguage } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle gallery file import from Home
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPages: ScannedPage[] = [];
    let processed = 0;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const corners = getDefaultCorners(img.width, img.height, 0.05);
          const croppedCanvas = perspectiveWarp(img, corners);
          const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);

          newPages.push({
            id: `page_${Date.now()}_${idx}`,
            originalImage: dataUrl,
            croppedImage: croppedUrl,
            processedImage: croppedUrl,
            thumbnail: croppedUrl,
            corners,
            rotation: 0,
            filter: 'auto_enhance',
            filterIntensity: 100,
            adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
            width: croppedCanvas.width,
            height: croppedCanvas.height,
          });

          processed++;
          if (processed === files.length) {
            const newDoc: ScannedDocument = {
              id: `doc_${Date.now()}`,
              title: file.name.replace(/\.[^/.]+$/, '') || `Scan ${new Date().toLocaleDateString()}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              pages: newPages,
              thumbnail: newPages[0].processedImage,
            };
            saveDocument(newDoc).then(() => {
              onRefreshData();
              onOpenDocument(newDoc);
            });
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadSample = async (type: 'contract' | 'arabic' | 'receipt') => {
    let sampleDoc: ScannedDocument;
    if (type === 'arabic') sampleDoc = createArabicSample();
    else if (type === 'receipt') sampleDoc = createReceiptSample();
    else sampleDoc = createContractSample();

    await saveDocument(sampleDoc);
    onRefreshData();
    onOpenDocument(sampleDoc);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-5 max-w-4xl mx-auto w-full pb-28 space-y-6">
      {/* Hidden file input for gallery import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryUpload}
        className="hidden"
      />

      {/* Hero Banner / Language Selector & Theme Toggle Lockup */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 p-5 sm:p-7 shadow-2xl text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                {t('appName')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
              {t('appSubtitle')}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('tagline')}
            </p>
          </div>

          {/* Controls: Install App, Theme Toggle & Quick Language switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Quick Install / Download App Button */}
            <PWAInstallButton variant="compact" />

            {/* Quick Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-amber-300 hover:text-white transition"
              title={resolvedTheme === 'dark' ? t('lightMode') : t('darkMode')}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-cyan-300" />}
            </button>

            {/* Quick Language switch pill buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800">
              {(['en', 'fr', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition min-h-[36px] ${
                    language === lang
                      ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'en' ? 'EN' : lang === 'fr' ? 'FR' : 'العربية'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons (Thumb Reach Zone) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <button
            onClick={onStartScan}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-semibold shadow-xl shadow-cyan-900/30 transition-all text-left rtl:text-right"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="block text-sm font-bold">{t('scanDocument')}</span>
              <span className="block text-[11px] opacity-80 font-normal">{t('scanDocumentDesc')}</span>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-white font-medium border border-slate-700 transition-all text-left rtl:text-right"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-cyan-400 shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-sm font-semibold">{t('importFromGallery')}</span>
              <span className="block text-[11px] text-slate-400">{t('importFromGalleryDesc')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Try Sample Documents Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{t('testSampleDocuments')}</h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">1-Click Test Drive</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleLoadSample('contract')}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left rtl:text-right transition flex items-center gap-3 group shadow-sm hover:shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t('sampleContract')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">English · Stamp & Sign</p>
            </div>
          </button>

          <button
            onClick={() => handleLoadSample('arabic')}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left rtl:text-right transition flex items-center gap-3 group shadow-sm hover:shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate font-arabic">{t('sampleArabicCertificate')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">العربية · شهادة رسمية</p>
            </div>
          </button>

          <button
            onClick={() => handleLoadSample('receipt')}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left rtl:text-right transition flex items-center gap-3 group shadow-sm hover:shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t('sampleReceipt')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Français · Ticket Paris</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Documents Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{t('recentDocuments')}</h2>
          {recentDocuments.length > 0 && (
            <button
              onClick={onViewAllDocuments}
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 font-medium flex items-center gap-1 transition"
            >
              <span>{t('viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          )}
        </div>

        {recentDocuments.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-center space-y-2 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('noRecentDocs')}</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">{t('noRecentDocsSub')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentDocuments.slice(0, 4).map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-950 overflow-hidden">
                  <img
                    src={doc.thumbnail || doc.pages[0]?.processedImage}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-white">
                    {doc.pages.length} p
                  </span>
                </div>
                <div className="p-2.5">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={doc.title}>
                    {doc.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
