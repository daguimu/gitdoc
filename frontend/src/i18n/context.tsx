import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import zh from './zh';
import en from './en';
import type { LocaleKeys } from './zh';

export type Lang = 'zh' | 'en';

const STORAGE_KEY = 'gitdoc_lang';

const locales: Record<Lang, Record<LocaleKeys, string>> = { zh, en };

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch (err) {
    console.warn('Failed to read language from storage', err);
  }
  return 'zh';
}

interface LocaleContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: LocaleKeys, ...args: (string | number)[]) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch (err) {
      console.warn('Failed to persist language to storage', err);
    }
  }, []);

  const t = useCallback(
    (key: LocaleKeys, ...args: (string | number)[]): string => {
      let str = locales[lang][key] || key;
      args.forEach((arg, i) => {
        str = str.replace(`{${i}}`, String(arg));
      });
      return str;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
