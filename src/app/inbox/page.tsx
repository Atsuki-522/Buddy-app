'use client';

import { useLocale } from '@/components/LocaleProvider';

export default function InboxPage() {
  const { t } = useLocale();

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t('hostInbox')}</h1>
      <p>{t('inboxPlaceholder')}</p>
    </main>
  );
}
