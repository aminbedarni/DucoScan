import React from 'react';
import { Camera, FileText, Home, Moon, Settings, Sun } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useTheme } from '../theme/context';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab = 'home' | 'scan' | 'documents' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  documentCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab, documentCount }) => {
  const { t } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <>
      {/* Desktop Responsive Top Header */}
      <header className="hidden md:flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            {t('appName')}
          </span>
        </div>

        {/* Clean Nav Links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => onSelectTab('home')}
            className={`transition whitespace-nowrap shrink-0 min-h-[44px] flex items-center ${
              currentTab === 'home'
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('navHome')}
          </button>
          <button
            onClick={() => onSelectTab('documents')}
            className={`transition whitespace-nowrap shrink-0 min-h-[44px] flex items-center gap-1.5 ${
              currentTab === 'documents'
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>{t('navDocuments')}</span>
            {documentCount !== undefined && documentCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300">
                {documentCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`transition whitespace-nowrap shrink-0 min-h-[44px] flex items-center ${
              currentTab === 'settings'
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('navSettings')}
          </button>
        </nav>

        {/* Action controls right: Install App + Theme Toggle + Scan CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton variant="compact" />

          <button
            onClick={toggleTheme}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={resolvedTheme === 'dark' ? t('lightMode') : t('darkMode')}
            aria-label="Toggle Theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            onClick={() => onSelectTab('scan')}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-400 dark:hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-900/20 whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[44px]"
          >
            <Camera className="w-4 h-4" />
            <span>{t('scanDocument')}</span>
          </button>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar (Ergonomic Thumb Zone) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors">
        <div className="grid grid-cols-4 items-center h-16">
          {/* Home */}
          <button
            onClick={() => onSelectTab('home')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition ${
              currentTab === 'home'
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">{t('navHome')}</span>
          </button>

          {/* Scan (Prominent Center Button) */}
          <button
            onClick={() => onSelectTab('scan')}
            className="min-h-[48px] flex flex-col items-center justify-center -mt-3"
            aria-label={t('navScan')}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30 active:scale-95 transition-transform">
              <Camera className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 mt-1">{t('navScan')}</span>
          </button>

          {/* Documents */}
          <button
            onClick={() => onSelectTab('documents')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition relative ${
              currentTab === 'documents'
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <FileText className="w-5 h-5" />
              {documentCount !== undefined && documentCount > 0 && (
                <span className="absolute -top-1 -right-2 text-[9px] font-mono px-1 rounded-full bg-cyan-500 text-white dark:text-slate-950 font-bold leading-tight">
                  {documentCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">{t('navDocuments')}</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => onSelectTab('settings')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition ${
              currentTab === 'settings'
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">{t('navSettings')}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
