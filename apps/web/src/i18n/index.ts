import { ar } from './ar';
import { en, type Messages } from './en';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'ar';
}

const dictionaries: Record<Locale, Messages> = { en, ar };

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale];
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'ar' : 'en';
}

export function textDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
