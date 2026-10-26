import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Laptop,
  MoreVertical,
  Share,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { usePWAInstall } from '../utils/pwaInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'full' | 'compact' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className,
  variant = 'full',
}) => {
  const { t, language } = useI18n();
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    triggerNativeInstall,
    downloadStandaloneAppLauncher,
  } = usePWAInstall();

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(() => {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'android';
  });
  const [downloadedLauncher, setDownloadedLauncher] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await triggerNativeInstall();
      if (outcome === 'unavailable') {
        setShowModal(true);
      }
    } else {
      // Always respond immediately by opening the Install & Download modal
      setActiveTab(isIOS ? 'ios' : isAndroid ? 'android' : 'android');
      setShowModal(true);
    }
  };

  const handleDirectDownload = () => {
    downloadStandaloneAppLauncher(t('appName'));
    setDownloadedLauncher(true);
    setTimeout(() => setDownloadedLauncher(false), 4000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback copy
    }
  };

  const labels = {
    ar: {
      btnShort: 'تحميل التطبيق',
      modalTitle: 'تحميل وتثبيت التطبيق على جهازك',
      modalSubtitle: 'اختر طريقة التحميل أو التثبيت المناسبة لهاتفك أو حاسوبك',
      directDownloadTitle: 'تحميل ملف مشغل التطبيق مباشرة (سريع)',
      directDownloadDesc: 'يحفظ ملف تشغيل التطبيق (DocuScan-Pro-App.html) مباشرة على جهازك للوصول السريع في أي وقت.',
      directDownloadBtn: 'تحميل ملف التطبيق الآن',
      downloadedSuccess: 'تم بدء تحميل ملف التطبيق بنجاح!',
      iframeTitle: 'التثبيت المباشر على الشاشة الرئيسية (PWA)',
      iframeDesc: 'لإظهار نافذة التثبيت التلقائية الخاصة بالمتصفح، افتح التطبيق في نافذة متصفح مستقلة ثم اضغط تثبيت:',
      openStandaloneBtn: 'فتح التطبيق في نافذة مستقلة للتثبيت',
      copyLinkBtn: 'نسخ رابط التطبيق',
      linkCopied: 'تم نسخ الرابط!',
      guideTitle: 'خطوات التثبيت على الشاشة الرئيسية حسب جهازك:',
      tabAndroid: 'أندرويد (Android)',
      tabIOS: 'آيفون / آيباد (iOS)',
      tabDesktop: 'الكمبيوتر (Desktop)',
      androidStep1: '1. افتح التطبيق في متصفح Chrome واضغط على زر القائمة (⋮) أعلى الشاشة.',
      androidStep2: '2. اختر "تثبيت التطبيق" (Install App) أو "الإضافة إلى الشاشة الرئيسية".',
      androidStep3: '3. اضغط "تثبيت" ليظهر التطبيق بأيقونته الكاملة مع دعم العمل بدون إنترنت.',
      iosStep1: '1. افتح التطبيق في متصفح Safari واضغط على زر المشاركة (Share) أسفل الشاشة.',
      iosStep2: '2. مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).',
      iosStep3: '3. اضغط "إضافة" (Add) في الزاوية العلوية لتشغيله كتطبيق مستقل.',
      desktopStep1: '1. في متصفح Chrome أو Edge، اضغط على أيقونة التثبيت في شريط العنوان أعلى المتصفح.',
      desktopStep2: '2. أو اضغط على زر "تحميل ملف التطبيق الآن" أعلاه لحفظ المشغل مباشرة على سطح المكتب.',
      installedBadge: 'التطبيق مثبت ويعمل بالوضع المستقل',
    },
    fr: {
      btnShort: 'Installer l\'App',
      modalTitle: 'Télécharger & Installer DocuScan Pro',
      modalSubtitle: 'Choisissez comment installer ou télécharger l\'application sur votre appareil',
      directDownloadTitle: 'Téléchargement Direct du Lanceur d\'Application',
      directDownloadDesc: 'Télécharge le fichier exécutable web (DocuScan-Pro-App.html) directement sur votre appareil.',
      directDownloadBtn: 'Télécharger le Fichier de l\'App',
      downloadedSuccess: 'Téléchargement démarré avec succès !',
      iframeTitle: 'Installation Native sur l\'Écran d\'Accueil (PWA)',
      iframeDesc: 'Pour activer l\'installation directe du navigateur, ouvrez l\'application dans un onglet indépendant :',
      openStandaloneBtn: 'Ouvrir dans un Nouvel Onglet pour Installer',
      copyLinkBtn: 'Copier le Lien',
      linkCopied: 'Lien copié !',
      guideTitle: 'Guide d\'installation selon votre appareil :',
      tabAndroid: 'Android (Chrome)',
      tabIOS: 'iPhone / iPad (Safari)',
      tabDesktop: 'Ordinateur (PC / Mac)',
      androidStep1: '1. Ouvrez le menu Chrome (⋮) en haut à droite.',
      androidStep2: '2. Appuyez sur « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».',
      androidStep3: '3. Confirmez pour ajouter l\'icône DocuScan Pro à votre téléphone.',
      iosStep1: '1. Appuyez sur le bouton Partager (Share) dans la barre d\'outils Safari.',
      iosStep2: '2. Faites défiler et appuyez sur « Sur l\'écran d\'accueil » (Add to Home Screen).',
      iosStep3: '3. Appuyez sur « Ajouter » en haut à droite.',
      desktopStep1: '1. Dans Chrome ou Edge, cliquez sur l\'icône d\'installation dans la barre d\'adresse.',
      desktopStep2: '2. Ou cliquez sur « Télécharger le Fichier de l\'App » ci-dessus.',
      installedBadge: 'Application installée',
    },
    en: {
      btnShort: 'Download App',
      modalTitle: 'Download & Install DocuScan Pro',
      modalSubtitle: 'Choose how to install or download the app to your phone or computer',
      directDownloadTitle: 'Direct App Launcher Download (Instant)',
      directDownloadDesc: 'Downloads the standalone DocuScan-Pro-App.html launcher file directly to your device.',
      directDownloadBtn: 'Download App File Now',
      downloadedSuccess: 'App file download started!',
      iframeTitle: 'Native Home Screen Installation (PWA)',
      iframeDesc: 'Browsers require opening the app in a standalone tab outside the preview frame to trigger 1-click native installation:',
      openStandaloneBtn: 'Open in Standalone Tab to Install',
      copyLinkBtn: 'Copy App URL',
      linkCopied: 'URL Copied!',
      guideTitle: 'Step-by-Step Home Screen Installation:',
      tabAndroid: 'Android (Chrome)',
      tabIOS: 'iPhone / iPad (iOS)',
      tabDesktop: 'Desktop (Chrome / Edge)',
      androidStep1: '1. Open the browser menu (⋮) in the top corner of Chrome.',
      androidStep2: '2. Tap "Install App" or "Add to Home screen".',
      androidStep3: '3. Confirm to place DocuScan Pro on your home screen with offline support.',
      iosStep1: '1. Tap the Share button in the Safari bottom toolbar.',
      iosStep2: '2. Scroll down and select "Add to Home Screen".',
      iosStep3: '3. Tap "Add" in the top-right corner to launch it as a full-screen app.',
      desktopStep1: '1. Click the Install icon on the right side of the Chrome/Edge address bar.',
      desktopStep2: '2. Or click "Download App File Now" above to save the desktop launcher.',
      installedBadge: 'App Installed',
    },
  };

  const l = labels[language] || labels.en;

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={
            className ||
            'min-h-[36px] px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/30 transition active:scale-95 cursor-pointer'
          }
          title={t('installPwaBtn')}
        >
          <Download className="w-3.5 h-3.5 stroke-[2.3]" />
          <span>{l.btnShort}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={
            className ||
            'flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-900/30 hover:bg-cyan-500 active:scale-[0.99] transition min-h-[44px] cursor-pointer'
          }
        >
          <Download className="w-4 h-4" />
          <span>{isInstalled ? l.installedBadge : t('installPwaBtn')}</span>
        </button>
      )}

      {/* Interactive Download & Install Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {l.modalTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {l.modalSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* 1. Instant File Download Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-indigo-500/10 border border-cyan-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {l.directDownloadTitle}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {l.directDownloadDesc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDirectDownload}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 transition cursor-pointer"
                >
                  {downloadedLauncher ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{l.downloadedSuccess}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{l.directDownloadBtn}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 2. Standalone Tab Opener (Especially helpful when inside preview iframe) */}
              {isInIframe && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
                      <span>{l.iframeTitle}</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {l.iframeDesc}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{l.openStandaloneBtn}</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{l.linkCopied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{l.copyLinkBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Device-Specific Instructions */}
              <div className="space-y-2.5">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {l.guideTitle}
                </span>

                {/* Device Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('android')}
                    className={`py-2 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                      activeTab === 'android'
                        ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="truncate">{l.tabAndroid}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ios')}
                    className={`py-2 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                      activeTab === 'ios'
                        ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Share className="w-3.5 h-3.5" />
                    <span className="truncate">{l.tabIOS}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('desktop')}
                    className={`py-2 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                      activeTab === 'desktop'
                        ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span className="truncate">{l.tabDesktop}</span>
                  </button>
                </div>

                {/* Tab Steps Content */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
                  {activeTab === 'android' && (
                    <>
                      <p className="flex items-center gap-2">
                        <MoreVertical className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>{l.androidStep1}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>{l.androidStep2}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{l.androidStep3}</span>
                      </p>
                    </>
                  )}

                  {activeTab === 'ios' && (
                    <>
                      <p className="flex items-center gap-2">
                        <Share className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>{l.iosStep1}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>{l.iosStep2}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{l.iosStep3}</span>
                      </p>
                    </>
                  )}

                  {activeTab === 'desktop' && (
                    <>
                      <p className="flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>{l.desktopStep1}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>{l.desktopStep2}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full min-h-[44px] rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
