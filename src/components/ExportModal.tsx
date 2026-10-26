import React, { useState } from 'react';
import { Download, FileText, Image, Share2, Sparkles, X } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { ExportFormat, ImageQuality, PageOrientation, PageSize, ScannedDocument, ScannedPage } from '../types';
import { exportDocumentFiles, shareOrDownloadFile } from '../utils/pdfExport';

interface ExportModalProps {
  document: ScannedDocument;
  currentPageIndex: number;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  document: doc,
  currentPageIndex,
  onClose,
}) => {
  const { t } = useI18n();

  const [fileName, setFileName] = useState<string>(() => {
    const clean = doc.title.replace(/[/\\?%*:|"<>]/g, '_').trim();
    return clean || `DocuScan_${new Date().toISOString().slice(0, 10)}`;
  });

  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [quality, setQuality] = useState<ImageQuality>('high');
  const [embedOcr, setEmbedOcr] = useState<boolean>(true);
  const [scope, setScope] = useState<'all' | 'current'>('all');

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const pagesToExport: ScannedPage[] =
    scope === 'current' && doc.pages[currentPageIndex]
      ? [doc.pages[currentPageIndex]]
      : doc.pages;

  const handleExport = async (action: 'download' | 'share') => {
    setIsExporting(true);
    setExportStatus(t('generatingPdf'));

    try {
      const ext = format === 'pdf' ? 'pdf' : format === 'png' ? 'png' : 'jpg';
      const fullFileName = `${fileName.trim() || 'Scan'}.${ext}`;

      const blob = await exportDocumentFiles({
        fileName: fullFileName,
        format,
        pageSize,
        orientation,
        quality,
        embedOcr,
        pages: pagesToExport,
      });

      if (action === 'share') {
        await shareOrDownloadFile(blob, fullFileName, doc.title);
      } else {
        const { downloadBlob } = await import('../utils/pdfExport');
        downloadBlob(blob, fullFileName);
      }

      setExportStatus(t('exportSuccess'));
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Export failed', err);
      setExportStatus(t('error'));
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">{t('exportModalTitle')}</h3>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* File Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('fileName')}</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              placeholder="Document_Name"
            />
          </div>

          {/* Format selection tabs */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('format')}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition min-h-[52px] ${
                  format === 'pdf'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 mb-1" />
                <span>PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('jpg')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition min-h-[52px] ${
                  format === 'jpg'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Image className="w-4 h-4 mb-1" />
                <span>JPEG Image</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition min-h-[52px] ${
                  format === 'png'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Image className="w-4 h-4 mb-1" />
                <span>PNG (Lossless)</span>
              </button>
            </div>
          </div>

          {/* PDF-Specific Options */}
          {format === 'pdf' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Page size */}
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

              {/* Embed OCR Toggle */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
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
          )}

          {/* Quality selection */}
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

          {/* Page scope */}
          {doc.pages.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('exportPages')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`py-2 text-xs rounded-lg border font-medium ${
                    scope === 'all'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('allPages', { count: doc.pages.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setScope('current')}
                  className={`py-2 text-xs rounded-lg border font-medium ${
                    scope === 'current'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('currentPageOnly')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
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
            <span>{isExporting ? exportStatus : t('downloadFile')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
