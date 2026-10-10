import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReportForm } from '@/components/report-form';
import type { ReportChoice } from '@/components/types';
import { getDictionary, isLocale } from '@/i18n';
import { getApp } from '@/lib/services';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).report.title };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ area?: string }>;
}) {
  const { locale } = await params;
  const { area } = await searchParams;
  if (!isLocale(locale)) notFound();
  const messages = getDictionary(locale);
  const app = await getApp();
  const areas = await app.repo.listAreas();
  const choices: ReportChoice[] = areas.map((item) => ({
    id: item.id,
    countryCode: item.countryCode,
    country: locale === 'ar' ? item.countryNameAr : item.countryNameEn,
    cityId: item.cityId,
    city: locale === 'ar' ? item.cityNameAr : item.cityNameEn,
    name: locale === 'ar' ? item.nameAr : item.nameEn,
  }));

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="bg-paper p-6 text-ink sm:p-8">
        <h1 className="font-serif text-4xl">{messages.report.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/80">{messages.report.lede}</p>
        <div className="mt-6">
          <ReportForm areas={choices} locale={locale} messages={messages} initialAreaId={area} />
        </div>
      </div>
    </main>
  );
}
