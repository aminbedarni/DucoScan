import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';
import { getAppSettings, saveAppSettings } from '../utils/storage';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'docuscan_theme_mode';

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved && (saved === 'dark' || saved === 'light' || saved === 'system')) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'dark'; // Dark default for professional mobile scanner
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(getSystemTheme);

  // Load from IndexedDB on startup if available
  useEffect(() => {
    getAppSettings().then((settings) => {
      if (settings?.theme) {
        setThemeState(settings.theme);
      }
    });
  }, []);

  // Listen to OS prefers-color-scheme changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: 'dark' | 'light' = theme === 'system' ? systemTheme : theme;

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      saveAppSettings({ theme: newTheme });
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  // Sync DOM classes and meta theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }

    // Update meta theme-color for mobile status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#090d16' : '#f8fafc');
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
