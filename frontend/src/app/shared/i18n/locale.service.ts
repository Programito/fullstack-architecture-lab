import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { KEY_VALUE_STORAGE } from '../utils/storage/key-value-storage';
import { DEFAULT_LOCALE, isAppLocale, LOCALE_STORAGE_KEY, normalizeLocale, type AppLocale } from './locale.types';

@Injectable({
  providedIn: 'root',
})
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(KEY_VALUE_STORAGE);
  private readonly transloco = inject(TranslocoService);

  private readonly _locale = signal<AppLocale>(this.getInitialLocale());

  readonly locale = this._locale.asReadonly();

  constructor() {
    this.applyLocale(this._locale());
  }

  setLocale(locale: AppLocale): void {
    this._locale.set(locale);
    this.storage.setItem(LOCALE_STORAGE_KEY, locale);
    this.applyLocale(locale);
  }

  private getInitialLocale(): AppLocale {
    const storedLocale = this.storage.getItem(LOCALE_STORAGE_KEY);

    if (isAppLocale(storedLocale)) {
      return storedLocale;
    }

    return this.getSystemLocale();
  }

  private getSystemLocale(): AppLocale {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_LOCALE;
    }

    const navigator = this.document.defaultView?.navigator;
    const languages = [...(navigator?.languages ?? []), navigator?.language].filter(
      (language): language is string => typeof language === 'string',
    );

    for (const language of languages) {
      const locale = normalizeLocale(language);

      if (locale) {
        return locale;
      }
    }

    return DEFAULT_LOCALE;
  }

  private applyLocale(locale: AppLocale): void {
    this.transloco.setActiveLang(locale);
    this.document.documentElement.lang = locale;
  }
}
