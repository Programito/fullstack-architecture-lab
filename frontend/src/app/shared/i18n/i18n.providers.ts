import { EnvironmentProviders, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from './locale.service';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locale.types';
import { TranslocoHttpLoader } from './transloco-http.loader';

export const loadInitialTranslations = (localeService: LocaleService, transloco: TranslocoService): Promise<unknown> =>
  firstValueFrom(transloco.load(localeService.locale()));

export const provideAppI18n = (): EnvironmentProviders[] => [
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
    const localeService = inject(LocaleService);
    const transloco = inject(TranslocoService);

    return loadInitialTranslations(localeService, transloco);
  }),
];
