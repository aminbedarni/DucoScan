import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global singleton state so beforeinstallprompt is captured immediately on app boot
// even before SettingsView or any specific tab is mounted.
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function initPWAInstallCapture() {
  if (typeof window === 'undefined') return;

  const checkStandalone = () => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    globalIsInstalled = isStandalone;
    notifyListeners();
  };

  checkStandalone();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

// Auto-initialize on module import
initPWAInstallCapture();

export function downloadStandaloneAppLauncher(appTitle = 'DocuScan Pro') {
  const appUrl = window.location.origin + window.location.pathname;
  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#090d16" />
  <title>${appTitle} - App Launcher</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      width: 100%; height: 100%; overflow: hidden;
      background: #090d16; color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Cairo, sans-serif;
    }
    .header-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px; background: #0f172a; border-bottom: 1px solid #1e293b;
      height: 46px; font-size: 13px;
    }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #22d3ee; }
    .open-btn {
      background: #06b6d4; color: #090d16; text-decoration: none;
      padding: 5px 12px; border-radius: 8px; font-weight: 600; font-size: 12px;
    }
    iframe {
      width: 100%; height: calc(100% - 46px); border: none; display: block;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="brand">
      <span>📄 ${appTitle}</span>
    </div>
    <a class="open-btn" href="${appUrl}" target="_blank" rel="noopener noreferrer">
      فتح بشاشة كاملة وتثبيت / Full Screen
    </a>
  </div>
  <iframe src="${appUrl}" allow="camera; microphone; clipboard-write; web-share" allowfullscreen></iframe>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'DocuScan-Pro-App.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(globalIsInstalled);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  useEffect(() => {
    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(globalIsInstalled);
    };

    listeners.add(syncState);
    syncState();

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    return () => {
      listeners.delete(syncState);
    };
  }, []);

  const triggerNativeInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!globalDeferredPrompt) return 'unavailable';
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifyListeners();
      }
      return outcome;
    } catch {
      return 'unavailable';
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    triggerNativeInstall,
    downloadStandaloneAppLauncher,
  };
}
