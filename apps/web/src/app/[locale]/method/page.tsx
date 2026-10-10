import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import metrics from '@/content/model-metrics.json';
import { getDictionary, isLocale } from '@/i18n';
import { formatNumber, formatPercent } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).method.title };
}

export default async function MethodPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getDictionary(locale);
  const rows = [
    { name: locale === 'ar' ? 'معدل الأساس' : 'Constant base rate', brier: metrics.constant.brier, auc: null },
    { name: locale === 'ar' ? 'تكرار الساعة' : 'Hour-of-week baseline', brier: metrics.baseline.brier, auc: metrics.baseline.auc },
    { name: locale === 'ar' ? 'انحدار لوجستي' : 'Logistic regression', brier: metrics.logistic.brier, auc: metrics.logistic.auc },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <article className="bg-paper p-6 text-ink sm:p-10">
        <h1 className="font-serif text-4xl leading-tight">{messages.method.title}</h1>
        <p className="mt-4 text-lg leading-8">{messages.method.lede}</p>
        {messages.method.sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="font-serif text-2xl">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="mt-3 leading-7 text-ink/85">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <section className="mt-10">
          <h2 className="font-serif text-2xl">{locale === 'ar' ? 'أرقام القياس' : 'Benchmark'}</h2>
          <p className="mt-2 text-sm text-ink/60">
            {metrics.areas} {locale === 'ar' ? 'حيًا' : 'neighbourhoods'} · {metrics.historyDays}{' '}
            {locale === 'ar' ? 'يومًا' : 'days'} · {locale === 'ar' ? 'اختبار' : 'holdout'} {metrics.holdoutDays}{' '}
            {locale === 'ar' ? 'يومًا' : 'days'} · {metrics.evaluatedAt.slice(0, 10)}
          </p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-start">
                <th className="py-2 font-medium">{locale === 'ar' ? 'النموذج' : 'Model'}</th>
                <th className="py-2 text-end font-medium">Brier</th>
                <th className="py-2 text-end font-medium">AUC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-rule">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2 text-end font-mono">{formatNumber(locale, row.brier, 4)}</td>
                  <td className="py-2 text-end font-mono">{row.auc === null ? '—' : formatNumber(locale, row.auc, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-ink/70">
            {locale === 'ar' ? 'مهارة مقابل معدل الأساس:' : 'Skill against the base rate:'}{' '}
            {locale === 'ar' ? 'الخط الأساس' : 'baseline'} {formatPercent(locale, metrics.skillVsConstant.baseline)},{' '}
            {locale === 'ar' ? 'اللوجستي' : 'logistic'} {formatPercent(locale, metrics.skillVsConstant.logistic)}.
          </p>
          <h3 className="mt-6 text-sm font-medium">{locale === 'ar' ? 'معايرة النموذج اللوجستي' : 'Logistic calibration'}</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-start">
                <th className="py-2 font-medium">{locale === 'ar' ? 'الشريحة' : 'Bin'}</th>
                <th className="py-2 text-end font-medium">{locale === 'ar' ? 'المتوقع' : 'Predicted'}</th>
                <th className="py-2 text-end font-medium">{locale === 'ar' ? 'الملاحظ' : 'Observed'}</th>
                <th className="py-2 text-end font-medium">{locale === 'ar' ? 'العدد' : 'Hours'}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.calibration
                .filter((bin) => bin.count > 0)
                .map((bin) => (
                  <tr key={`${bin.from}-${bin.to}`} className="border-b border-rule">
                    <td className="py-2 font-mono">
                      {formatPercent(locale, bin.from)}–{formatPercent(locale, bin.to)}
                    </td>
                    <td className="py-2 text-end font-mono">{formatNumber(locale, bin.predicted, 3)}</td>
                    <td className="py-2 text-end font-mono">{formatNumber(locale, bin.observed, 3)}</td>
                    <td className="py-2 text-end font-mono">{formatNumber(locale, bin.count)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </article>
    </main>
  );
}
