import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { zh } from './zh';
import { en } from './en';

type Locale = 'zh' | 'en';
type Dict = typeof zh;

const LocaleContext = createContext<{ locale: Locale; toggle: () => void }>({
  locale: 'zh',
  toggle: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem('locale') as Locale) ?? 'zh'
  );
  const toggle = () => setLocale(l => {
    const next: Locale = l === 'zh' ? 'en' : 'zh';
    localStorage.setItem('locale', next);
    return next;
  });
  return (
    <LocaleContext.Provider value={{ locale, toggle }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const { locale } = useContext(LocaleContext);
  return useMemo(() => {
    const dict: Dict = locale === 'zh' ? zh : en as unknown as Dict;
    return function t(key: keyof Dict, vars?: Record<string, string | number>): string {
      let s: string = dict[key] as string;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return s;
    };
  }, [locale]);
}
