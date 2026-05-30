import { signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LocaleService } from '../../i18n/locale.service';
import type { AppLocale } from '../../i18n/locale.types';
import { LanguageSelect } from './language-select';

class TestLocaleService {
  private readonly _locale = signal<AppLocale>('es');

  readonly locale = this._locale.asReadonly();
  readonly setLocale = vi.fn((locale: AppLocale) => {
    this._locale.set(locale);
  });
}

describe('LanguageSelect', () => {
  const renderLanguageSelect = async (locale: AppLocale = 'es') => {
    const localeService = new TestLocaleService();
    localeService.setLocale(locale);
    localeService.setLocale.mockClear();

    await render('<app-language-select />', {
      imports: [LanguageSelect],
      providers: [{ provide: LocaleService, useValue: localeService }],
    });

    return localeService;
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

    expect(screen.getByRole('button', { name: 'Idioma: English' })).toBeTruthy();
    expect(screen.getByText('EN')).toBeTruthy();
  });

  it('updates the locale when selection changes', async () => {
    const localeService = await renderLanguageSelect('es');

    fireEvent.click(screen.getByRole('button', { name: 'Idioma: Español' }));
    fireEvent.click(screen.getByRole('option', { name: 'CA Català' }));

    expect(localeService.setLocale).toHaveBeenCalledWith('ca');
    expect(screen.queryByRole('listbox', { name: 'Idioma' })).toBeNull();
  });

  it('closes the menu when escape is pressed', async () => {
    await renderLanguageSelect();

    fireEvent.click(screen.getByRole('button', { name: 'Idioma: Español' }));
    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Idioma' }), { key: 'Escape' });

    expect(screen.queryByRole('listbox', { name: 'Idioma' })).toBeNull();
  });

  it('does not open when disabled', async () => {
    await render('<app-language-select disabled />', {
      imports: [LanguageSelect],
      providers: [{ provide: LocaleService, useValue: new TestLocaleService() }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Idioma: Español' }));

    expect(screen.queryByRole('listbox', { name: 'Idioma' })).toBeNull();
  });

  it('supports minimal appearance', async () => {
    const { container } = await render('<app-language-select appearance="minimal" />', {
      imports: [LanguageSelect],
      providers: [{ provide: LocaleService, useValue: new TestLocaleService() }],
    });

    expect(container.querySelector('.language-select')?.className).toContain('language-select--minimal');
  });
});
