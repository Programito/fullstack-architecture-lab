import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { KEY_VALUE_STORAGE, type KeyValueStorage } from '../utils/storage/key-value-storage';
import { LocaleService } from './locale.service';
import { LOCALE_STORAGE_KEY, type AppLocale } from './locale.types';

class TestStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  constructor(initialValues: Record<string, string> = {}) {
    Object.entries(initialValues).forEach(([key, value]) => this.values.set(key, value));
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const setNavigatorLanguages = (languages: string[], language = languages[0] ?? 'fr-FR') => {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });

  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  });
};

describe('LocaleService', () => {
  let transloco: { setActiveLang: ReturnType<typeof vi.fn> };

  const configure = (storage = new TestStorage()) => {
    transloco = { setActiveLang: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: TranslocoService, useValue: transloco },
      ],
    });

    return { service: TestBed.inject(LocaleService), storage };
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    document.documentElement.removeAttribute('lang');
    setNavigatorLanguages(['fr-FR']);
  });

  it('uses es when storage is empty and system locale is unsupported', () => {
    const { service } = configure();

    expect(service.locale()).toBe<AppLocale>('es');
    expect(transloco.setActiveLang).toHaveBeenCalledWith('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('uses a valid stored locale', () => {
    const { service } = configure(new TestStorage({ [LOCALE_STORAGE_KEY]: 'ca' }));

    expect(service.locale()).toBe<AppLocale>('ca');
    expect(transloco.setActiveLang).toHaveBeenCalledWith('ca');
  });

  it('ignores an invalid stored locale', () => {
    setNavigatorLanguages(['en-US']);

    const { service } = configure(new TestStorage({ [LOCALE_STORAGE_KEY]: 'de' }));

    expect(service.locale()).toBe<AppLocale>('en');
  });

  it.each([
    ['en-US', 'en'],
    ['es-ES', 'es'],
    ['ca-ES', 'ca'],
  ] as const)('normalizes %s to %s', (systemLanguage, expectedLocale) => {
    setNavigatorLanguages([systemLanguage]);

    const { service } = configure();

    expect(service.locale()).toBe<AppLocale>(expectedLocale);
  });

  it('persists explicit locale changes', () => {
    const { service, storage } = configure();

    service.setLocale('en');

    expect(service.locale()).toBe<AppLocale>('en');
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(transloco.setActiveLang).toHaveBeenLastCalledWith('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
