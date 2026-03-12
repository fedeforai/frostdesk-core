'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'frostdesk_instructor_ui_lang';

export type AppLocale = 'en' | 'it';

type AppLocaleContextValue = {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

function readStored(): AppLocale {
  if (typeof window === 'undefined') return 'en';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'it' || v === 'en') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function AppLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(readStored());
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  if (!mounted) {
    return (
      <AppLocaleContext.Provider value={{ locale: 'en', setLocale }}>
        {children}
      </AppLocaleContext.Provider>
    );
  }

  return (
    <AppLocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </AppLocaleContext.Provider>
  );
}

export function useAppLocale(): AppLocaleContextValue {
  const ctx = useContext(AppLocaleContext);
  if (!ctx) throw new Error('useAppLocale must be used within AppLocaleProvider');
  return ctx;
}
