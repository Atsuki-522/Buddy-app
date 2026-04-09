'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { AppLocale, formatDateTime, formatTime, getDatePickerLocale, resolveLocale, statusLabel, t as translate } from '@/lib/i18n';

type LocaleContextValue = {
  locale: AppLocale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatDateTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  datePickerLocale: ReturnType<typeof getDatePickerLocale>;
  statusLabel: (status: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export default function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  const locale = initialLocale;

  useEffect(() => {
    document.documentElement.lang = resolveLocale(navigator.languages?.[0] ?? navigator.language);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    t: (key, vars) => translate(locale, key, vars),
    formatDateTime: (value, options) => formatDateTime(value, locale, options),
    formatTime: (value, options) => formatTime(value, locale, options),
    datePickerLocale: getDatePickerLocale(locale),
    statusLabel: (status) => statusLabel(status, locale),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
