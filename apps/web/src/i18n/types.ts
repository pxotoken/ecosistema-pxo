export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

/** Label shown in the language switcher for each locale. */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'ESP',
  en: 'ENG',
};

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);
