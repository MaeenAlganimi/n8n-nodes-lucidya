export type BotLocale = 'en' | 'ar';

export function botLocale(languageCode: string | undefined, stored: string | null): BotLocale {
  if (stored === 'ar' || stored === 'en') return stored;
  return languageCode?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export const copy = {
  en: {
    start:
      'Barq tracks neighbourhood power cuts. Send /report when the power changes, /subscribe for a warning when the next hour looks likely to be out, and /status for what is confirmed right now.',
    chooseCountry: 'Choose a country',
    chooseCity: 'Choose a city',
    chooseArea: 'Choose a neighbourhood',
    chooseKind: 'What changed?',
    off: 'Power is off',
    on: 'Power is back',
    chooseThreshold: 'Warn me when the next hour is at least',
    recorded: 'Recorded. It stays unconfirmed until a second person reports it.',
    confirmed: 'Confirmed. Two reports agree the power is off.',
    resolved: 'Recorded. Two reports agree the power is back.',
    dismissed: 'The unconfirmed report was cleared.',
    duplicate: 'You already sent this recently.',
    too_fast: 'Wait a moment before another report.',
    daily_cap: 'Daily report limit reached.',
    unknown_area: 'That neighbourhood is not listed.',
    none: 'No confirmed outages right now.',
    subscribed: 'Subscribed.',
    unsubscribed: 'Unsubscribed.',
    noSubs: 'You have no subscriptions. /subscribe to add one.',
    yourSubs: 'Your neighbourhoods',
    unsubscribe: 'Stop',
    langSet: 'Language updated.',
    help: '/report  /subscribe  /unsubscribe  /status  /lang en  /lang ar',
    prediction: (name: string, percent: number) =>
      `Barq: outage likely in ${name} during the next hour (${percent}%).`,
    powerBack: (name: string) => `Barq: power is back in ${name}.`,
  },
  ar: {
    start:
      'برق يتابع انقطاع الكهرباء في الأحياء. أرسل /report عند تغيّر الكهرباء، و /subscribe لتنبيه عندما تبدو الساعة القادمة مرجّحة للانقطاع، و /status لما هو مؤكد الآن.',
    chooseCountry: 'اختر بلدًا',
    chooseCity: 'اختر مدينة',
    chooseArea: 'اختر حيًا',
    chooseKind: 'ماذا تغيّر؟',
    off: 'الكهرباء مقطوعة',
    on: 'عادت الكهرباء',
    chooseThreshold: 'نبّهني عندما تبلغ الساعة القادمة على الأقل',
    recorded: 'سُجّل البلاغ. يبقى غير مؤكد إلى أن يبلّغ شخص ثانٍ.',
    confirmed: 'مؤكد. بلاغان متفقان على أن الكهرباء مقطوعة.',
    resolved: 'سُجّل. بلاغان متفقان على أن الكهرباء عادت.',
    dismissed: 'أُلغي البلاغ غير المؤكد.',
    duplicate: 'أرسلت هذا البلاغ قبل قليل.',
    too_fast: 'انتظر لحظة قبل بلاغ آخر.',
    daily_cap: 'بلغت حد البلاغات اليومي.',
    unknown_area: 'هذا الحي غير موجود.',
    none: 'لا يوجد انقطاع مؤكد الآن.',
    subscribed: 'تم الاشتراك.',
    unsubscribed: 'أُلغي الاشتراك.',
    noSubs: 'لا اشتراكات لديك. /subscribe لإضافة واحد.',
    yourSubs: 'أحياؤك',
    unsubscribe: 'إيقاف',
    langSet: 'تم تحديث اللغة.',
    help: '/report  /subscribe  /unsubscribe  /status  /lang ar  /lang en',
    prediction: (name: string, percent: number) => `برق: احتمال انقطاع الكهرباء في ${name} خلال الساعة القادمة (${percent}%).`,
    powerBack: (name: string) => `برق: عادت الكهرباء في ${name}.`,
  },
} as const;
