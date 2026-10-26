import React, { useEffect, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCheck,
  Globe,
  HelpCircle,
  Info,
  Laptop,
  Lock,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Sun,
  Trash2,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useTheme } from '../theme/context';
import { AppSettings, ExportFormat, ImageQuality, Language, PageSize, ThemeMode } from '../types';
import { clearAllDocuments, getAllDocuments, getAppSettings, getStorageEstimate, saveAppSettings } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshData }) => {
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [storageUsage, setStorageUsage] = useState<string>('0 MB');
  const [showApkGuide, setShowApkGuide] = useState<boolean>(false);
  const [showQAChecklist, setShowQAChecklist] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const s = await getAppSettings();
      setSettings(s);
      const est = await getStorageEstimate();
      setStorageUsage(est.formatted);
    }
    load();
  }, []);

  const handleUpdate = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await saveAppSettings(patch);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    handleUpdate({ language: lang });
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    handleUpdate({ theme: newTheme });
  };

  const handleClearData = async () => {
    if (confirm(t('clearAllDataConfirm'))) {
      await clearAllDocuments();
      const est = await getStorageEstimate();
      setStorageUsage(est.formatted);
      onRefreshData();
      alert(t('clearDataSuccess'));
    }
  };

  const handleBackupData = async () => {
    const docs = await getAllDocuments();
    const jsonStr = JSON.stringify(docs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DocuScan_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!settings) return null;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-5 max-w-3xl mx-auto w-full pb-28 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t('settingsTitle')}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('appName')} · {t('appVersion')}</p>
      </div>

      {/* 1. Theme Selection Section (Dark Mode & Light Mode) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
          <Palette className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>{t('themeSection')}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('themeDesc')}</p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Dark Mode */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`py-3 px-2 rounded-xl border text-center font-medium transition min-h-[56px] flex flex-col items-center justify-center gap-1 ${
              theme === 'dark'
                ? 'bg-slate-900 border-cyan-500 text-cyan-300 font-semibold shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Moon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs">{t('darkMode')}</span>
          </button>

          {/* Light Mode */}
          <button
            onClick={() => handleThemeChange('light')}
            className={`py-3 px-2 rounded-xl border text-center font-medium transition min-h-[56px] flex flex-col items-center justify-center gap-1 ${
              theme === 'light'
                ? 'bg-cyan-50 border-cyan-600 text-cyan-900 font-semibold shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-xs">{t('lightMode')}</span>
          </button>

          {/* System Default */}
          <button
            onClick={() => handleThemeChange('system')}
            className={`py-3 px-2 rounded-xl border text-center font-medium transition min-h-[56px] flex flex-col items-center justify-center gap-1 ${
              theme === 'system'
                ? 'bg-cyan-50 dark:bg-slate-900 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-semibold shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4 text-slate-500" />
            <span className="text-xs">{t('systemTheme')}</span>
          </button>
        </div>
      </div>

      {/* 2. Language Selection Section */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
          <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>{t('languageSection')}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`py-3 px-3 rounded-xl border text-center font-medium transition min-h-[50px] flex flex-col items-center justify-center ${
              language === 'en'
                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-semibold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-xs">English</span>
            <span className="text-[10px] opacity-60">US / Global</span>
          </button>

          <button
            onClick={() => handleLanguageChange('fr')}
            className={`py-3 px-3 rounded-xl border text-center font-medium transition min-h-[50px] flex flex-col items-center justify-center ${
              language === 'fr'
                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-semibold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-xs">Français</span>
            <span className="text-[10px] opacity-60">Europe / Canada</span>
          </button>

          <button
            onClick={() => handleLanguageChange('ar')}
            className={`py-3 px-3 rounded-xl border text-center font-medium transition min-h-[50px] flex flex-col items-center justify-center font-arabic ${
              language === 'ar'
                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-semibold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-xs">العربية</span>
            <span className="text-[10px] opacity-60">تنسيق كامل RTL</span>
          </button>
        </div>
      </div>

      {/* 3. Scanning Preferences Section */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
          <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>{t('scanningPreferences')}</span>
        </div>

        {/* Auto Capture Toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">{t('autoCapture')}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('pageHoldSteady')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoCaptureEnabled}
              onChange={(e) => handleUpdate({ autoCaptureEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>

        {/* Sensitivity Selector */}
        <div className="flex items-center justify-between py-1 border-t border-slate-200 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('autoCaptureSensitivity')}</span>
          <select
            value={settings.autoCaptureSensitivity}
            onChange={(e) => handleUpdate({ autoCaptureSensitivity: e.target.value as 'low' | 'medium' | 'high' })}
            className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="low">{t('sensitivityLow')}</option>
            <option value="medium">{t('sensitivityMed')}</option>
            <option value="high">{t('sensitivityHigh')}</option>
          </select>
        </div>

        {/* Haptic Feedback Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-slate-200 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('hapticFeedbackLabel')}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.hapticFeedback}
              onChange={(e) => handleUpdate({ hapticFeedback: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>
      </div>

      {/* 4. Export Defaults Section */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
          <FileCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>{t('exportDefaults')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">{t('defaultFormat')}</label>
            <select
              value={settings.defaultExportFormat}
              onChange={(e) => handleUpdate({ defaultExportFormat: e.target.value as ExportFormat })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="pdf">PDF (Multipage document)</option>
              <option value="jpg">JPEG Image</option>
              <option value="png">PNG (Lossless)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">{t('defaultPageSize')}</label>
            <select
              value={settings.defaultPageSize}
              onChange={(e) => handleUpdate({ defaultPageSize: e.target.value as PageSize })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="a4">{t('sizeA4')}</option>
              <option value="a5">{t('sizeA5')}</option>
              <option value="letter">{t('sizeLetter')}</option>
              <option value="original">{t('sizeOriginal')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Local Storage & Privacy Section */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
          <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>{t('localStorageSection')}</span>
        </div>

        {/* Privacy summary */}
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex gap-2.5">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">{t('privacyNoticeTitle')}</h4>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">{t('privacyNoticeDesc')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">{t('totalStorageUsed')}</span>
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{storageUsage}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackupData}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition min-h-[40px]"
            >
              <Archive className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>Backup</span>
            </button>
            <button
              onClick={handleClearData}
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-1.5 transition min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('clearAllData')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Mobile PWA & APK Packaging */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
          <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>{t('appInfoSection')}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <PWAInstallButton className="flex-1 min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 transition" />

          <button
            onClick={() => setShowApkGuide(true)}
            className="flex-1 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition"
          >
            <Info className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span>{t('viewApkInstructions')}</span>
          </button>
        </div>

        {/* QA Testing checklist button */}
        <button
          onClick={() => setShowQAChecklist(true)}
          className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-between px-4 transition"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>{t('testingChecklistBtn')}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
        </button>
      </div>

      {/* APK & iOS Instructions Modal */}
      {showApkGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Android APK & iOS Packaging Guide</h3>
              <button
                onClick={() => setShowApkGuide(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                DocuScan Pro is architected as a Progressive Web App (PWA) with camera, WebGL/Canvas, and local IndexedDB support. You can wrap it into a native Android APK or iOS app instantly using either method:
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-semibold text-cyan-600 dark:text-cyan-400 block">Method A: Google Bubblewrap (Trusted Web Activity APK)</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Generates a signed release APK ready for the Google Play Store:</p>
                <pre className="p-2 bg-slate-100 dark:bg-slate-900 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto">
{`# 1. Install Bubblewrap CLI
npm i -g @bubblewrap/cli

# 2. Initialize project from your deployed URL
bubblewrap init --manifest=https://your-app-url/manifest.webmanifest

# 3. Build signed Android APK / AAB bundle
bubblewrap build`}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-semibold text-cyan-600 dark:text-cyan-400 block">Method B: Capacitor (Android Studio & Xcode)</span>
                <pre className="p-2 bg-slate-100 dark:bg-slate-900 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto">
{`# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/camera @capacitor/filesystem

# 2. Add Android & iOS platforms
npx cap add android
npx cap add ios

# 3. Build and run in Android Studio
npm run build && npx cap sync
npx cap open android`}
                </pre>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You can also install it directly to any Android or iOS home screen with offline support by tapping the <strong className="text-slate-900 dark:text-white">"Install App on Mobile Home Screen"</strong> button!
              </p>
            </div>

            <button
              onClick={() => setShowApkGuide(false)}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[44px]"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* QA Testing Checklist Modal */}
      {showQAChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Quality Assurance (QA) Testing Checklist</h3>
              <button
                onClick={() => setShowQAChecklist(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {[
                { title: '1. Dark & Light Mode Theme Support', desc: 'Seamless switching between high-contrast dark mode, daylight light mode, and system preference.' },
                { title: '2. Scanning Accuracy & Boundary Detection', desc: 'Real-time 4-corner quad detection highlights documents against dark/light tables.' },
                { title: '3. Perspective Correction & Cropping', desc: 'Bilinear projective transform correctly rectifies angled or skewed photos into flat pages.' },
                { title: '4. All 30 Document Enhancement Filters', desc: 'Every filter (Auto, B&W, Shadow Removal, Blueprint, Receipt, ID Card, etc.) produces distinct, readable results.' },
                { title: '5. Multilingual OCR (Arabic, French, English)', desc: 'Character recognition accurately transcribes texts with copyable output and PDF embedding.' },
                { title: '6. PDF, JPG, PNG & Bulk Export', desc: 'Single and bulk export for merged multipage PDF and ZIP archive of image files.' },
                { title: '7. Full Arabic RTL Interface', desc: 'Arabic switches layout to true Right-to-Left with proper Cairo typography and reversed directional icons.' },
                { title: '8. Local Storage & Zero Data Leakage', desc: 'IndexedDB stores scans offline; documents persist after page refresh with 100% on-device privacy.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-white">{item.title}</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowQAChecklist(false)}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[44px]"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
