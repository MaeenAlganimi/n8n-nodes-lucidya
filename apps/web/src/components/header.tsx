'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { otherLocale, type Locale } from '@/i18n';
import type { Messages } from '@/i18n/en';

export function Header({ locale, messages }: { locale: Locale; messages: Messages }) {
  const pathname = usePathname();
  const next = otherLocale(locale);
  const switched = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${next}`) || `/${next}`;
  const links = [
    { href: `/${locale}`, label: messages.nav.map },
    { href: `/${locale}/report`, label: messages.nav.report },
    { href: `/${locale}/method`, label: messages.nav.method },
    { href: `/${locale}/docs`, label: messages.nav.api },
  ];

  return (
    <header className="sticky top-0 z-[500] border-b border-white/10 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="group flex items-baseline gap-3">
          <span className="font-serif text-2xl leading-none tracking-tight">{messages.brand}</span>
          <span className="text-sm text-amber">{messages.brandMark}</span>
          <span className="hidden text-sm text-paper/60 sm:inline">{messages.tagline}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-3" aria-label={messages.nav.map}>
          {links.map((link) => {
            const active = link.href === `/${locale}` ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'px-2 py-1 text-amber' : 'px-2 py-1 text-paper/80 hover:text-paper'}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href={switched}
            hrefLang={next}
            className="ms-1 border border-white/20 px-2 py-1 text-paper hover:border-amber hover:text-amber"
            aria-label={messages.language.label}
          >
            {messages.language[next]}
          </Link>
        </nav>
      </div>
    </header>
  );
}
