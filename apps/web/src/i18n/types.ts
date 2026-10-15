export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * English by default (October 2026 landing). Only applies to visitors with no
 * stored choice — anyone who has already picked a language keeps it, since
 * `pxo:locale` is read first.
 */
export const DEFAULT_LOCALE: Locale = 'en';

/** Label shown in the language switcher for each locale. */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'ESP',
  en: 'ENG',
};

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);
