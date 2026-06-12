import { fireEvent, render, screen } from '@testing-library/angular';
import { provideI18nTesting } from '../../i18n/i18n-testing';
import { LocaleService } from '../../i18n/locale.service';
import type { AppLocale } from '../../i18n/locale.types';
import { LanguageSelect } from './language-select';

describe('LanguageSelect', () => {
  const renderLanguageSelect = async (locale: AppLocale = 'es') => {
    const i18n = provideI18nTesting(locale);

    await render('<app-language-select />', {
      imports: [LanguageSelect, ...i18n.imports],
      providers: [...i18n.providers],
    });

    return screen;
  };

  it('renders a compact trigger with the active locale code', async () => {
    await renderLanguageSelect();

    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeTruthy();
    expect(screen.getByText('ES')).toBeTruthy();
  });

  it('opens the language menu with the supported languages', async () => {
    await renderLanguageSelect();

    fireEvent.click(screen.getByRole('button', { name: 'Idioma: Español' }));

    expect(screen.getByRole('listbox', { name: 'Idioma' })).toBeTruthy();
    expect(screen.getByText('Español')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('Català')).toBeTruthy();
  });

  it('reflects the active locale', async () => {
    await renderLanguageSelect('en');

    expect(screen.getByRole('button', { name: 'Language: English' })).toBeTruthy();
    expect(screen.getByText('EN')).toBeTruthy();
  });

  it('updates the locale when selection changes', async () => {
    const i18n = provideI18nTesting('es');
    const { fixture } = await render('<app-language-select />', {
      imports: [LanguageSelect, ...i18n.imports],
      providers: [...i18n.providers],
    });
    const localeService = fixture.debugElement.injector.get(LocaleService);

    fireEvent.click(screen.getByRole('button', { name: 'Idioma: Español' }));
    fireEvent.click(screen.getByRole('option', { name: 'CA Català' }));

    expect(localeService.locale()).toBe('ca');
    expect(screen.queryByRole('listbox', { name: 'Idioma' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Idioma: Català' })).toBeTruthy();
  });

  it('translates labels when the active locale changes', async () => {
    await renderLanguageSelect('en');

    expect(screen.getByRole('button', { name: 'Language: English' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Language: English' }));
    fireEvent.click(screen.getByRole('option', { name: 'ES Español' }));

    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeTruthy();
  });

  it('closes the menu when escape is pressed', async () => {
    await renderLanguageSelect();

    fireEvent.click(screen.getByRole('button', { name: 'Idioma: Español' }));
    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Idioma' }), { key: 'Escape' });

    expect(screen.queryByRole('listbox', { name: 'Idioma' })).toBeNull();
  });

  it('does not open when disabled', async () => {
    await render('<app-language-select disabled />', {
      imports: [LanguageSelect, ...provideI18nTesting().imports],
      providers: [...provideI18nTesting().providers],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Idioma: Español' }));

    expect(screen.queryByRole('listbox', { name: 'Idioma' })).toBeNull();
  });

  it('supports minimal appearance', async () => {
    const { container } = await render('<app-language-select appearance="minimal" />', {
      imports: [LanguageSelect, ...provideI18nTesting().imports],
      providers: [...provideI18nTesting().providers],
    });

    expect(container.querySelector('.language-select')?.className).toContain('language-select--minimal');
  });

  it('supports opening the menu upward', async () => {
    const { container } = await render('<app-language-select placement="top" />', {
      imports: [LanguageSelect, ...provideI18nTesting().imports],
      providers: [...provideI18nTesting().providers],
    });

    expect(container.querySelector('.language-select')?.className).toContain('language-select--top');
  });

  it('can hide the visible label and hint while keeping an accessible trigger name', async () => {
    await render('<app-language-select [showLabel]="false" [showHint]="false" />', {
      imports: [LanguageSelect, ...provideI18nTesting().imports],
      providers: [...provideI18nTesting().providers],
    });

    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeTruthy();
    expect(screen.queryByText('Idioma')).toBeNull();
    expect(screen.queryByText('La preferencia se aplica a la interfaz.')).toBeNull();
  });
});
