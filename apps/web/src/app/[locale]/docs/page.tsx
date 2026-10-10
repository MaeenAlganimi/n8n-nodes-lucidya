import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/i18n';
import { loadOpenApi } from '@/lib/openapi';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).docs.title };
}

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getDictionary(locale);
  const spec = loadOpenApi();
  const rows = Object.entries(spec.paths).flatMap(([path, operations]) =>
    Object.entries(operations).map(([method, operation]) => ({
      method: method.toUpperCase(),
      path,
      summary: operation.summary ?? '',
      description: operation.description ?? '',
    })),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <article className="bg-paper p-6 text-ink sm:p-10">
        <h1 className="font-serif text-4xl">{messages.docs.title}</h1>
        <p className="mt-4 leading-7">{messages.docs.lede}</p>
        <p className="mt-4">
          <a href="/api/openapi" className="underline">
            {messages.docs.spec}
          </a>
        </p>
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-start">
              <th className="py-2 font-medium">{messages.docs.method}</th>
              <th className="py-2 font-medium">{messages.docs.path}</th>
              <th className="py-2 font-medium">{messages.docs.about}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.method}${row.path}`} className="border-b border-rule align-top">
                <td className="py-3 font-mono text-xs">{row.method}</td>
                <td className="py-3 font-mono text-xs">{row.path}</td>
                <td className="py-3">
                  <p>{row.summary}</p>
                  {row.description ? <p className="mt-1 text-ink/70">{row.description}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </main>
  );
}
