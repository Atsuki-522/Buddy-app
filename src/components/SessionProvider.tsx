'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import LocaleProvider from '@/components/LocaleProvider';
import type { AppLocale } from '@/lib/i18n';

export default function SessionProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  return (
    <NextAuthSessionProvider>
      <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    </NextAuthSessionProvider>
  );
}
