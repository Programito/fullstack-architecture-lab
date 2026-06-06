import { TestBed } from '@angular/core/testing';
import { provideAppTheme } from './theme.providers';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../utils/storage/key-value-storage';

describe('theme providers', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    document.documentElement.removeAttribute('data-theme');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('instantiates the color mode service during app initialization', () => {
    TestBed.configureTestingModule({
      providers: [
        provideAppTheme(),
        { provide: KEY_VALUE_STORAGE, useValue: new MemoryKeyValueStorage() },
      ],
    });

    TestBed.tick();

    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
