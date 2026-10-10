import { notFound } from 'next/navigation';
import { getDictionary, isLocale, textDir, type Locale } from '@/i18n';
import { getApp } from '@/lib/services';
import { Header } from '@/components/header';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const messages = getDictionary(locale);
  const app = await getApp();
  const synthetic = (await app.repo.getMeta('synthetic')) === 'true';

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[600] focus:bg-amber focus:px-3 focus:py-2 focus:text-ink"
      >
        {messages.skip}
      </a>
      {synthetic ? <p className="bg-amber px-4 py-2 text-sm text-ink">{messages.banner}</p> : null}
      <Header locale={locale} messages={messages} />
      <div id="content" dir={textDir(locale)}>
        {children}
      </div>
    </>
  );
}
