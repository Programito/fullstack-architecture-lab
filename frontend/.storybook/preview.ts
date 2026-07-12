import { Component, inject, Input, OnChanges } from '@angular/core';
import { applicationConfig, componentWrapperDecorator } from '@storybook/angular';
import type { Preview } from '@storybook/angular';
import { provideAppI18n } from '../src/app/shared/i18n/i18n.providers';
import { LocaleService } from '../src/app/shared/i18n/locale.service';
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from '../src/app/shared/i18n/locale.types';

type StorybookColorMode = 'light' | 'dark' | 'system';
type ResolvedColorMode = Exclude<StorybookColorMode, 'system'>;
type StorybookFontFamily = 'inter' | 'geist' | 'jakarta' | 'roboto' | 'system';
type StorybookFontFamilyOverride = StorybookFontFamily | 'inherit';

@Component({
  selector: 'storybook-locale-sync',
  standalone: true,
  template: '<ng-content />',
})
class StorybookLocaleSync implements OnChanges {
  private readonly localeService = inject(LocaleService);

  @Input() storybookLocale: AppLocale = DEFAULT_LOCALE;

  ngOnChanges(): void {
    this.localeService.setLocale(this.storybookLocale);
  }
}

@Component({
  selector: 'storybook-font-override',
  standalone: true,
  template: `
    <div
      [attr.data-font]="storybookFontFamilyOverride === 'inherit' ? null : storybookFontFamilyOverride"
      [style.font-family]="storybookFontFamilyOverride === 'inherit' ? null : 'var(--ui-font-sans)'"
    >
      <ng-content />
    </div>
  `,
})
class StorybookFontOverride {
  @Input() storybookFontFamilyOverride: StorybookFontFamilyOverride = 'inherit';
}

const resolveColorMode = (preference: StorybookColorMode, backgrounds: unknown): ResolvedColorMode => {
  if (preference !== 'system') {
    return preference;
  }

  const backgroundMode = resolveBackgroundColorMode(backgrounds);

  if (backgroundMode) {
    return backgroundMode;
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveBackgroundColorMode = (backgrounds: unknown): ResolvedColorMode | null => {
  const value = getBackgroundValue(backgrounds);

  if (!value) {
    return null;
  }

  const lowerValue = value.toLowerCase();

  if (lowerValue.includes('dark')) {
    return 'dark';
  }

  if (lowerValue.includes('light')) {
    return 'light';
  }

  return resolveHexColorMode(lowerValue);
};

const getBackgroundValue = (backgrounds: unknown): string | null => {
  if (typeof backgrounds === 'string') {
    return backgrounds;
  }

  if (!backgrounds || typeof backgrounds !== 'object') {
    return null;
  }

  const value = (backgrounds as Record<string, unknown>)['value'];
  return typeof value === 'string' ? value : null;
};

const resolveHexColorMode = (value: string): ResolvedColorMode | null => {
  const match = value.match(/^#(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})$/i);

  if (!match?.groups) {
    return null;
  }

  const red = Number.parseInt(match.groups['red'], 16);
  const green = Number.parseInt(match.groups['green'], 16);
  const blue = Number.parseInt(match.groups['blue'], 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance < 0.5 ? 'dark' : 'light';
};

const applyCanvasTheme = (mode: ResolvedColorMode): void => {
  document.documentElement.dataset['theme'] = mode;
  document.body.dataset['theme'] = mode;
  document.documentElement.style.background = 'var(--ui-bg)';
  document.documentElement.style.color = 'var(--ui-fg)';
  document.body.style.background = 'var(--ui-bg)';
  document.body.style.color = 'var(--ui-fg)';
};

const applyCanvasThemePreference = (preference: StorybookColorMode): void => {
  document.documentElement.dataset['themePreference'] = preference;
  document.body.dataset['themePreference'] = preference;

  try {
    if (preference === 'system') {
      globalThis.localStorage?.removeItem('color-mode');
      return;
    }

    globalThis.localStorage?.setItem('color-mode', preference);
  } catch {
    // Storybook can run in restricted browser contexts; dataset updates still keep the preview aligned.
  }
};

const resolveStorybookLocale = (locale: unknown): AppLocale => {
  if (typeof locale === 'string') {
    return normalizeLocale(locale) ?? DEFAULT_LOCALE;
  }

  return DEFAULT_LOCALE;
};

const applyCanvasLocale = (locale: AppLocale): void => {
  document.documentElement.lang = locale;

  try {
    globalThis.localStorage?.setItem('locale', locale);
  } catch {
    // Storybook can run in restricted browser contexts; the Angular service still receives the locale.
  }
};

const resolveStorybookFontFamily = (fontFamily: unknown): StorybookFontFamily => {
  if (
    fontFamily === 'inter' ||
    fontFamily === 'geist' ||
    fontFamily === 'jakarta' ||
    fontFamily === 'roboto' ||
    fontFamily === 'system'
  ) {
    return fontFamily;
  }

  return 'inter';
};

const resolveStorybookFontFamilyOverride = (fontFamily: unknown): StorybookFontFamilyOverride => {
  if (fontFamily === 'inherit') {
    return 'inherit';
  }

  return resolveStorybookFontFamily(fontFamily);
};

const applyCanvasFontFamily = (fontFamily: StorybookFontFamily): void => {
  document.documentElement.dataset['font'] = fontFamily;
  document.body.dataset['font'] = fontFamily;
};

const preview: Preview = {
  initialGlobals: {
    colorMode: 'system',
    fontFamily: 'inter',
    locale: DEFAULT_LOCALE,
  },
  globalTypes: {
    colorMode: {
      description: 'Color mode',
      defaultValue: 'system',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    fontFamily: {
      description: 'Font family',
      defaultValue: 'inter',
      toolbar: {
        title: 'Font',
        icon: 'type',
        items: [
          { value: 'inter', title: 'Inter' },
          { value: 'geist', title: 'Geist Sans' },
          { value: 'jakarta', title: 'Plus Jakarta Sans' },
          { value: 'roboto', title: 'Roboto' },
          { value: 'system', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Locale',
      defaultValue: DEFAULT_LOCALE,
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'es', title: 'Español' },
          { value: 'en', title: 'English' },
          { value: 'ca', title: 'Català' },
        ],
        dynamicTitle: true,
      },
    },
  },
  args: {
    fontFamilyOverride: 'inherit',
  },
  argTypes: {
    fontFamilyOverride: {
      name: 'Font override',
      control: 'select',
      options: ['inherit', 'inter', 'geist', 'jakarta', 'roboto', 'system'],
      table: {
        category: 'Storybook',
      },
    },
  },
  decorators: [
    applicationConfig({
      providers: [...provideAppI18n()],
    }),
    componentWrapperDecorator(StorybookLocaleSync, (context) => ({
      storybookLocale: resolveStorybookLocale(context.globals['locale']),
    })),
    componentWrapperDecorator(StorybookFontOverride, (context) => ({
      storybookFontFamilyOverride: resolveStorybookFontFamilyOverride(context.args['fontFamilyOverride']),
    })),
    (story, context) => {
      const preference = (context.globals['colorMode'] ?? 'system') as StorybookColorMode;
      const mode = resolveColorMode(preference, context.globals['backgrounds']);
      const fontFamily = resolveStorybookFontFamily(context.globals['fontFamily']);
      const locale = resolveStorybookLocale(context.globals['locale']);

      applyCanvasThemePreference(preference);
      applyCanvasTheme(mode);
      applyCanvasFontFamily(fontFamily);
      applyCanvasLocale(locale);

      return story();
    },
  ],
  parameters: {
    backgrounds: {
      default: 'theme',
      options: {
        theme: { name: 'Theme', value: 'var(--ui-bg)' },
        light: { name: 'Light', value: '#ffffff' },
        dark: { name: 'Dark', value: '#09090b' },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
