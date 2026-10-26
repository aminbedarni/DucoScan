import React, { useEffect, useMemo, useState } from 'react';
import { Sliders } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { TranslationKey } from '../i18n/translations';
import { FilterDefinition, FilterId } from '../types';
import { ALL_FILTERS, applyFilterToCanvas } from '../utils/filters';

interface FilterGalleryProps {
  currentFilter: FilterId;
  filterIntensity: number;
  previewCanvasSource: HTMLCanvasElement | null;
  onSelectFilter: (filterId: FilterId) => void;
  onChangeIntensity: (intensity: number) => void;
}

export const FilterGallery: React.FC<FilterGalleryProps> = ({
  currentFilter,
  filterIntensity,
  previewCanvasSource,
  onSelectFilter,
  onChangeIntensity,
}) => {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterThumbnails, setFilterThumbnails] = useState<Record<FilterId, string>>({} as Record<FilterId, string>);

  // Generate lightweight micro-thumbnails for all 30 filters when source image changes
  useEffect(() => {
    if (!previewCanvasSource) return;

    // Create downscaled canvas for fast thumbnail rendering
    const thumbCanvas = document.createElement('canvas');
    const thumbW = 72;
    const thumbH = Math.round((thumbW * previewCanvasSource.height) / previewCanvasSource.width);
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const tCtx = thumbCanvas.getContext('2d');
    if (!tCtx) return;
    tCtx.drawImage(previewCanvasSource, 0, 0, thumbW, thumbH);

    const generated: Record<string, string> = {};
    ALL_FILTERS.forEach((filter) => {
      const filtered = applyFilterToCanvas(thumbCanvas, filter.id, 100);
      generated[filter.id] = filtered.toDataURL('image/jpeg', 0.8);
    });

    setFilterThumbnails(generated as Record<FilterId, string>);
  }, [previewCanvasSource]);

  const categories = useMemo(
    () => [
      { id: 'all', label: 'All 30' },
      { id: 'bw', label: 'B & W' },
      { id: 'text', label: 'Sharp Text' },
      { id: 'color', label: 'Color & Tone' },
      { id: 'restoration', label: 'Restoration' },
      { id: 'specialty', label: 'Specialty' },
    ],
    []
  );

  const filteredList = useMemo(() => {
    if (selectedCategory === 'all') return ALL_FILTERS;
    return ALL_FILTERS.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
      {/* Category selector row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition min-h-[32px] ${
              selectedCategory === cat.id
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Horizontal thumbnail scroll gallery */}
      <div className="flex items-center gap-2.5 overflow-x-auto py-1 scroll-smooth">
        {filteredList.map((filter: FilterDefinition, index: number) => {
          const isSelected = currentFilter === filter.id;
          const thumbUrl = filterThumbnails[filter.id];

          return (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              className={`group flex flex-col items-center gap-1.5 shrink-0 focus:outline-none transition rounded-lg p-1 ${
                isSelected
                  ? 'ring-2 ring-cyan-500 bg-slate-100 dark:bg-slate-800/80 shadow-md'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="relative w-16 h-20 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={t(filter.nameKey as TranslationKey)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">#{index + 1}</span>
                )}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <span
                className={`text-[10px] max-w-[72px] text-center truncate leading-tight ${
                  isSelected ? 'text-cyan-600 dark:text-cyan-300 font-semibold' : 'text-slate-600 dark:text-slate-400'
                }`}
                title={t(filter.nameKey as TranslationKey)}
              >
                {t(filter.nameKey as TranslationKey)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Intensity slider when filter is active */}
      {currentFilter !== 'original' && (
        <div className="flex items-center gap-3 px-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 shrink-0">
            <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{t('filterIntensity')}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={filterIntensity}
            onChange={(e) => onChangeIntensity(Number(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-300 w-8 text-right tabular-nums">
            {filterIntensity}%
          </span>
        </div>
      )}
    </div>
  );
};
