import React, { useState } from 'react';
import {
  Archive,
  Check,
  CheckSquare,
  Download,
  Edit2,
  FileText,
  Grid,
  List,
  Plus,
  Search,
  Square,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { ScannedDocument } from '../types';
import { deleteDocument, saveDocument, toggleFavorite } from '../utils/storage';
import { BulkExportModal } from './BulkExportModal';
import { ExportModal } from './ExportModal';

interface DocumentsViewProps {
  documents: ScannedDocument[];
  onOpenDocument: (doc: ScannedDocument) => void;
  onRefresh: () => void;
  onStartScan: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onOpenDocument,
  onRefresh,
  onStartScan,
}) => {
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  // Selection Mode for Bulk Export
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isBulkExportOpen, setIsBulkExportOpen] = useState<boolean>(false);

  // Rename modal
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');

  // Single document export modal state
  const [exportDoc, setExportDoc] = useState<ScannedDocument | null>(null);

  // Filter & sort
  const filteredDocs = documents
    .filter((doc) => {
      if (onlyFavorites && !doc.isFavorite) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      // Match title
      if (doc.title.toLowerCase().includes(q)) return true;
      // Match OCR text inside any page
      const hasOcrMatch = doc.pages.some((p) => p.ocrText?.toLowerCase().includes(q));
      return hasOcrMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.updatedAt - a.updatedAt;
      if (sortBy === 'oldest') return a.updatedAt - b.updatedAt;
      return a.title.localeCompare(b.title);
    });

  const selectedDocs = documents.filter((d) => selectedDocIds.has(d.id));
  const selectedPagesCount = selectedDocs.reduce((acc, d) => acc + d.pages.length, 0);

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedDocIds(new Set());
    } else {
      setIsSelectionMode(true);
    }
  };

  const handleToggleSelectDoc = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocIds.size === filteredDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const handleDocClick = (doc: ScannedDocument) => {
    if (isSelectionMode) {
      handleToggleSelectDoc(doc.id);
    } else {
      onOpenDocument(doc);
    }
  };

  const handleToggleFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(id);
    onRefresh();
  };

  const handleDelete = async (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('confirmDeleteDoc', { title: doc.title }))) {
      await deleteDocument(doc.id);
      if (selectedDocIds.has(doc.id)) {
        setSelectedDocIds((prev) => {
          const next = new Set(prev);
          next.delete(doc.id);
          return next;
        });
      }
      onRefresh();
    }
  };

  const handleStartRename = (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocId(doc.id);
    setNewTitle(doc.title);
  };

  const handleSaveRename = async (doc: ScannedDocument, e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      await saveDocument({ ...doc, title: newTitle.trim() });
      setEditingDocId(null);
      onRefresh();
    }
  };

  const handleQuickExport = (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportDoc(doc);
  };

  const handleOpenBulkExportModal = () => {
    if (selectedDocIds.size === 0) return;
    setIsBulkExportOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 max-w-5xl mx-auto w-full pb-32">
      {/* Header & Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t('documentsTitle')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {documents.length} {t('docsCount')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Select Mode Toggle */}
          <button
            onClick={toggleSelectionMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition min-h-[44px] ${
              isSelectionMode
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-950/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>{isSelectionMode ? t('cancelSelection') : t('selectMode')}</span>
          </button>

          {/* New Scan button (when not selecting) */}
          {!isSelectionMode && (
            <button
              onClick={onStartScan}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('scanDocument')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar & View Toggles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchDocumentsPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 shadow-sm rtl:pr-9 rtl:pl-3"
          />
        </div>

        {/* Filter & View mode controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Select All in selection mode */}
          {isSelectionMode ? (
            <button
              onClick={handleSelectAll}
              className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-cyan-600 dark:text-cyan-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm"
            >
              {selectedDocIds.size === filteredDocs.length ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>{t('deselectAll')}</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{t('selectAll')}</span>
                </>
              )}
            </button>
          ) : (
            <>
              {/* Favorite filter toggle */}
              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`min-h-[40px] px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition shadow-sm ${
                  onlyFavorites
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/50 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current text-amber-500' : ''}`} />
                <span className="hidden sm:inline">{t('favoritesOnly')}</span>
              </button>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
                className="min-h-[40px] px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 shadow-sm"
              >
                <option value="newest">{t('sortNewest')}</option>
                <option value="oldest">{t('sortOldest')}</option>
                <option value="name">{t('sortName')}</option>
              </select>
            </>
          )}

          {/* Grid / List switcher */}
          <div className="flex items-center p-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded min-h-[36px] min-w-[36px] flex items-center justify-center transition ${
                viewMode === 'grid' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 dark:text-slate-500'
              }`}
              title={t('viewGrid')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded min-h-[36px] min-w-[36px] flex items-center justify-center transition ${
                viewMode === 'list' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 dark:text-slate-500'
              }`}
              title={t('viewList')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid / List */}
      {filteredDocs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1">
            {searchQuery ? t('noDocsMatch') : t('noRecentDocs')}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs">{t('noRecentDocsSub')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDocIds.has(doc.id);

            return (
              <div
                key={doc.id}
                onClick={() => handleDocClick(doc)}
                className={`group relative flex flex-col rounded-2xl overflow-hidden transition cursor-pointer shadow-sm ${
                  isSelected
                    ? 'ring-2 ring-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-500/50 shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                }`}
              >
                {/* Document Thumbnail with page count tag */}
                <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={doc.thumbnail || doc.pages[0]?.processedImage}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Selection Checkbox */}
                  {isSelectionMode ? (
                    <div
                      onClick={(e) => handleToggleSelectDoc(doc.id, e)}
                      className={`absolute top-2 left-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full transition shadow-md ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 ring-2 ring-white'
                          : 'bg-black/60 border border-white/40 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    /* Favorite badge when not selecting */
                    <button
                      onClick={(e) => handleToggleFav(doc.id, e)}
                      className={`absolute top-2 right-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full backdrop-blur-md transition ${
                        doc.isFavorite
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-black/40 text-white/70 hover:text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${doc.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  {/* Page count pill */}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono text-white">
                    {doc.pages.length} {t('pagesCount')}
                  </span>
                </div>

                {/* Title & metadata footer */}
                <div className="p-3 flex flex-col justify-between flex-1">
                  {editingDocId === doc.id ? (
                    <form onSubmit={(e) => handleSaveRename(doc, e)} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={(e) => handleSaveRename(doc, e)}
                        autoFocus
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-cyan-500 rounded px-1.5 py-1 text-slate-900 dark:text-white"
                      />
                    </form>
                  ) : (
                    <h4
                      className={`text-xs font-semibold truncate mb-1 ${
                        isSelected
                          ? 'text-cyan-600 dark:text-cyan-300'
                          : 'text-slate-900 dark:text-white'
                      }`}
                      title={doc.title}
                    >
                      {doc.title}
                    </h4>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    {!isSelectionMode && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleStartRename(doc, e)}
                          className="p-1 hover:text-cyan-500 dark:hover:text-cyan-400 transition"
                          title={t('renameDoc')}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleQuickExport(doc, e)}
                          className="p-1 hover:text-cyan-500 dark:hover:text-cyan-400 transition"
                          title={t('exportDoc')}
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(doc, e)}
                          className="p-1 hover:text-rose-500 dark:hover:text-rose-400 transition"
                          title={t('deleteDoc')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-sm">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDocIds.has(doc.id);

            return (
              <div
                key={doc.id}
                onClick={() => handleDocClick(doc)}
                className={`flex items-center gap-3.5 p-3 transition cursor-pointer ${
                  isSelected ? 'bg-cyan-50 dark:bg-cyan-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div
                    onClick={(e) => handleToggleSelectDoc(doc.id, e)}
                    className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition shrink-0 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950'
                        : 'border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 shrink-0 border border-slate-200 dark:border-slate-800">
                  <img
                    src={doc.thumbnail || doc.pages[0]?.processedImage}
                    alt={doc.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-xs font-semibold truncate ${
                      isSelected ? 'text-cyan-600 dark:text-cyan-300' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {doc.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>
                      {doc.pages.length} {t('pagesCount')}
                    </span>
                    <span>·</span>
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {!isSelectionMode && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handleToggleFav(doc.id, e)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-amber-500"
                    >
                      <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-current text-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => handleQuickExport(doc, e)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(doc, e)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Bar in Selection Mode (Thumb Reach Zone) */}
      {isSelectionMode && (
        <div className="fixed bottom-16 md:bottom-6 left-4 right-4 max-w-lg mx-auto z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 pl-2 rtl:pl-0 rtl:pr-2">
            <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">
              {selectedDocIds.size}
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                {t('selectedCount', { count: selectedDocIds.size })}
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                {selectedPagesCount} {t('pagesCount')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedDocIds(new Set());
              }}
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:text-white text-xs font-medium transition"
            >
              {t('cancel')}
            </button>

            <button
              onClick={handleOpenBulkExportModal}
              disabled={selectedDocIds.size === 0}
              className="min-h-[44px] px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-40 text-white dark:text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/20 transition active:scale-[0.98]"
            >
              <Archive className="w-4 h-4" />
              <span>{t('bulkExport')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Single Document Export Modal */}
      {exportDoc && (
        <ExportModal
          document={exportDoc}
          currentPageIndex={0}
          onClose={() => setExportDoc(null)}
        />
      )}

      {/* Bulk Export Modal */}
      {isBulkExportOpen && selectedDocs.length > 0 && (
        <BulkExportModal
          documents={selectedDocs}
          onClose={() => setIsBulkExportOpen(false)}
        />
      )}
    </div>
  );
};
