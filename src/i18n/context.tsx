import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language } from '../types';
import { translations, TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isRtl: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'docuscan_app_language';

function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (saved && (saved === 'en' || saved === 'fr' || saved === 'ar')) {
      return saved;
    }

    const browserLang = (navigator.language || (navigator as { userLanguage?: string }).userLanguage || '').toLowerCase();
    if (browserLang.startsWith('ar')) return 'ar';
    if (browserLang.startsWith('fr')) return 'fr';
    return 'en';
  } catch {
    return 'en';
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  const isRtl = language === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Failed to save language preference', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    if (isRtl) {
      document.body.classList.add('rtl-mode');
    } else {
      document.body.classList.remove('rtl-mode');
    }
  }, [language, dir, isRtl]);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    let text: string = (dict as Record<string, string>)[key] || (translations.en as Record<string, string>)[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(val));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return ctx;
}
