import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { ColorModeService } from './color-mode.service';

export const initializeAppTheme = (colorMode: ColorModeService): void => {
  colorMode.mode();
};

export const provideAppTheme = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideAppInitializer(() => {
      initializeAppTheme(inject(ColorModeService));
    }),
  ]);
