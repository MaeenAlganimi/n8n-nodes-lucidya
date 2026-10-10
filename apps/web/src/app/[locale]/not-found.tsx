import Link from 'next/link';
import { headers } from 'next/headers';
import { getDictionary, isLocale } from '@/i18n';

export default async function NotFound() {
  const headerList = await headers();
  const raw = headerList.get('x-locale');
  const locale = raw && isLocale(raw) ? raw : 'en';
  const messages = getDictionary(locale);
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="bg-paper p-8 text-ink">
        <h1 className="font-serif text-4xl">{messages.notFound.title}</h1>
        <p className="mt-3">{messages.notFound.body}</p>
        <Link href={`/${locale}`} className="mt-6 inline-block underline">
          {messages.notFound.back}
        </Link>
      </div>
    </main>
  );
}
