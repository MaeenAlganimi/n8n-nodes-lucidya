import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Newsreader } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const newsreader = Newsreader({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-serif', display: 'swap' });
const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-arabic',
  display: 'swap',
});
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Barq', template: '%s · Barq' },
  description: 'See whether the power is out in a neighbourhood, and how the next 24 hours look.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const locale = headerList.get('x-locale') === 'ar' ? 'ar' : 'en';
  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${newsreader.variable} ${plex.variable} ${plexArabic.variable} ${mono.variable}`}
    >
      <body className="bg-ink font-sans text-paper antialiased">{children}</body>
    </html>
  );
}
