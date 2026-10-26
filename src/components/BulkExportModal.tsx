import React, { useState } from 'react';
import {
  Archive,
  BookOpen,
  Check,
  Download,
  FileArchive,
  FileText,
  Image,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { ImageQuality, PageOrientation, PageSize, ScannedDocument } from '../types';
import { exportBulkMergedPdf, exportBulkZipArchive, shareOrDownloadFile } from '../utils/pdfExport';

interface BulkExportModalProps {
  documents: ScannedDocument[];
  onClose: () => void;
}

export const BulkExportModal: React.FC<BulkExportModalProps> = ({ documents, onClose }) => {
  const { t } = useI18n();

  const [exportType, setExportType] = useState<'merged_pdf' | 'zip_archive'>('merged_pdf');

  // Filename
  const dateStr = new Date().toISOString().slice(0, 10);
  const [fileName, setFileName] = useState<string>(() => {
    return `DocuScan_Merged_${documents.length}_Docs_${dateStr}`;
  });

  // PDF settings
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [quality, setQuality] = useState<ImageQuality>('high');
  const [embedOcr, setEmbedOcr] = useState<boolean>(true);
  const [includeCoverPage, setIncludeCoverPage] = useState<boolean>(true);

  // ZIP settings
  const [zipImgFormat, setZipImgFormat] = useState<'jpg' | 'png'>('jpg');
  const [includeOcrTxt, setIncludeOcrTxt] = useState<boolean>(true);

  // Processing state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const totalPages = documents.reduce((acc, d) => acc + d.pages.length, 0);

  const handleExport = async (action: 'download' | 'share') => {
    setIsExporting(true);
    setProgressPercent(10);

    try {
      let finalBlob: Blob;
      let finalExt = 'pdf';

      if (exportType === 'merged_pdf') {
        setStatusMessage(t('generatingPdf'));
        setProgressPercent(25);

        finalBlob = await exportBulkMergedPdf(documents, {
          fileName: fileName.trim(),
          pageSize,
          orientation,
          quality,
          embedOcr,
          includeCoverPage,
        });
        finalExt = 'pdf';
      } else {
        setStatusMessage(t('generatingZip'));
        setProgressPercent(15);

        finalBlob = await exportBulkZipArchive(documents, {
          fileName: fileName.trim(),
          format: zipImgFormat,
          quality,
          includeOcrText: includeOcrTxt,
          onProgress: (percent, msg) => {
            setProgressPercent(percent);
            setStatusMessage(msg);
          },
        });
        finalExt = 'zip';
      }

      setProgressPercent(100);
      setStatusMessage(t('exportSuccess'));

      const cleanName = (fileName.trim() || 'DocuScan_Export').replace(/[/\\?%*:|"<>]/g, '_');
      const fullFileName = `${cleanName}.${finalExt}`;

      if (action === 'share') {
        await shareOrDownloadFile(finalBlob, fullFileName, cleanName);
      } else {
        const { downloadBlob } = await import('../utils/pdfExport');
        downloadBlob(finalBlob, fullFileName);
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Bulk export failed', err);
      setStatusMessage(t('error'));
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
                {t('bulkExportModalTitle')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('bulkExportSummary', { docCount: documents.length, pageCount: totalPages })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Documents Thumbnail Strip */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          {documents.map((doc, idx) => (
            <div
              key={doc.id}
              className="relative shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-[180px] shadow-sm"
            >
              <div className="w-7 h-9 rounded bg-slate-100 dark:bg-slate-950 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/50">
                <img
                  src={doc.thumbnail || doc.pages[0]?.processedImage}
                  alt={doc.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-900 dark:text-white truncate" title={doc.title}>
                  {doc.title}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {doc.pages.length} {t('pagesCount')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Export Type Selection Tabs */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('format')}</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setExportType('merged_pdf');
                  setFileName(`DocuScan_Merged_${documents.length}_Docs_${dateStr}`);
                }}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left rtl:text-right transition min-h-[64px] ${
                  exportType === 'merged_pdf'
                    ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-cyan-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    exportType === 'merged_pdf'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold">{t('bulkMergedPdf')}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {t('bulkMergedPdfDesc', { docCount: documents.length, pageCount: totalPages })}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportType('zip_archive');
                  setFileName(`DocuScan_Archive_${documents.length}_Docs_${dateStr}`);
                }}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left rtl:text-right transition min-h-[64px] ${
                  exportType === 'zip_archive'
                    ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-cyan-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    exportType === 'zip_archive'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileArchive className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold">{t('bulkZipArchive')}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {t('bulkZipArchiveDesc')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Filename Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('fileName')}</label>
            <div className="flex items-center">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                placeholder="Export_File_Name"
              />
              <span className="px-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                .{exportType === 'merged_pdf' ? 'pdf' : 'zip'}
              </span>
            </div>
          </div>

          {/* Type-Specific Options */}
          {exportType === 'merged_pdf' ? (
            /* Merged PDF Options */
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Page Size */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{t('pageSize')}</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSize)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="a4">{t('sizeA4')}</option>
                    <option value="a5">{t('sizeA5')}</option>
                    <option value="letter">{t('sizeLetter')}</option>
                    <option value="original">{t('sizeOriginal')}</option>
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{t('orientation')}</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as PageOrientation)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="portrait">{t('portrait')}</option>
                    <option value="landscape">{t('landscape')}</option>
                    <option value="auto">{t('autoOrientation')}</option>
                  </select>
                </div>
              </div>

              {/* Toggles: Cover Page & Searchable OCR */}
              <div className="pt-1 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCoverPage}
                    onChange={(e) => setIncludeCoverPage(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-0 bg-white dark:bg-slate-900"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                    {t('includeCoverPage')}
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={embedOcr}
                    onChange={(e) => setEmbedOcr(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-0 bg-white dark:bg-slate-900"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                    {t('embedOcrText')}
                  </span>
                </label>
              </div>
            </div>
          ) : (
            /* ZIP Archive Options */
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Page Image Format inside ZIP
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setZipImgFormat('jpg')}
                    className={`py-2 px-3 text-xs rounded-lg border font-medium flex items-center justify-center gap-2 ${
                      zipImgFormat === 'jpg'
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Image className="w-3.5 h-3.5" />
                    <span>JPEG (.jpg)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZipImgFormat('png')}
                    className={`py-2 px-3 text-xs rounded-lg border font-medium flex items-center justify-center gap-2 ${
                      zipImgFormat === 'png'
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Image className="w-3.5 h-3.5" />
                    <span>PNG Lossless (.png)</span>
                  </button>
                </div>
              </div>

              {/* Include OCR .txt files */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOcrTxt}
                  onChange={(e) => setIncludeOcrTxt(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-0 bg-white dark:bg-slate-900"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                  {t('includeOcrTxtInZip')}
                </span>
              </label>
            </div>
          )}

          {/* Quality Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('quality')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition ${
                    quality === q
                      ? 'bg-cyan-50 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-cyan-500/60 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {q === 'high' ? 'High 100%' : q === 'medium' ? 'Medium 80%' : 'Low 60%'}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar when exporting */}
          {isExporting && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">{statusMessage}</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center gap-3 pb-safe">
          <button
            onClick={() => handleExport('share')}
            disabled={isExporting}
            className="flex-1 min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('shareFile')}</span>
          </button>

          <button
            onClick={() => handleExport('download')}
            disabled={isExporting}
            className="flex-1 min-h-[46px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? statusMessage : t('downloadFile')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
