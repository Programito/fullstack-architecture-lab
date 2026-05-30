export const DEFAULT_LOCALE = 'es';
export const SUPPORTED_LOCALES = ['es', 'en', 'ca'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = 'locale';

export const LOCALE_OPTIONS: Array<{ label: string; value: AppLocale }> = [
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
  { label: 'Català', value: 'ca' },
];

export const isAppLocale = (value: string | null | undefined): value is AppLocale =>
  SUPPORTED_LOCALES.includes(value as AppLocale);

export const normalizeLocale = (value: string | null | undefined): AppLocale | null => {
  if (!value) {
    return null;
  }

  const language = value.trim().toLowerCase().split('-')[0];
  return isAppLocale(language) ? language : null;
};
