import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { LocaleService } from './locale.service';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locale.types';
import { TranslocoHttpLoader } from './transloco-http.loader';

export const provideAppI18n = (): EnvironmentProviders[] => [
  provideHttpClient(),
  ...provideTransloco({
    config: {
      availableLangs: [...SUPPORTED_LOCALES],
      defaultLang: DEFAULT_LOCALE,
      fallbackLang: DEFAULT_LOCALE,
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
    },
    loader: TranslocoHttpLoader,
  }),
  provideAppInitializer(() => {
    inject(LocaleService);
  }),
];
