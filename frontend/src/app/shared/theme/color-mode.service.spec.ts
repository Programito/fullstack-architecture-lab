import { TestBed } from '@angular/core/testing';
import { ColorModeService } from './color-mode.service';
import type { ColorMode } from './color-mode.types';
import { KEY_VALUE_STORAGE, type KeyValueStorage } from '../utils/storage/key-value-storage';

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

const setMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('ColorModeService', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    TestBed.resetTestingModule();
  });

  it('uses system preference when storage has no value', () => {
    setMatchMedia(true);

    TestBed.configureTestingModule({
      providers: [{ provide: KEY_VALUE_STORAGE, useValue: new TestStorage() }],
    });

    const service = TestBed.inject(ColorModeService);
    TestBed.tick();

    expect(service.preference()).toBe('system');
    expect(service.mode()).toBe<ColorMode>('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('persists explicit light and dark preferences', () => {
    setMatchMedia(false);
    const storage = new TestStorage();

    TestBed.configureTestingModule({
      providers: [{ provide: KEY_VALUE_STORAGE, useValue: storage }],
    });

    const service = TestBed.inject(ColorModeService);

    service.setPreference('dark');
    TestBed.tick();

    expect(service.preference()).toBe('dark');
    expect(storage.getItem('color-mode')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('removes storage value when preference returns to system', () => {
    setMatchMedia(false);
    const storage = new TestStorage({ 'color-mode': 'dark' });

    TestBed.configureTestingModule({
      providers: [{ provide: KEY_VALUE_STORAGE, useValue: storage }],
    });

    const service = TestBed.inject(ColorModeService);

    service.setPreference('system');
    TestBed.tick();

    expect(service.preference()).toBe('system');
    expect(storage.getItem('color-mode')).toBeNull();
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
