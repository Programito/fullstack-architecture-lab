import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { KEY_VALUE_STORAGE } from '../utils/storage/key-value-storage';
import type { ColorMode, ColorModePreference } from './color-mode.types';

const COLOR_MODE_STORAGE_KEY = 'color-mode';

@Injectable({
  providedIn: 'root',
})
export class ColorModeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storage = inject(KEY_VALUE_STORAGE);
  private readonly mediaQuery = this.getMediaQuery();

  private readonly _preference = signal<ColorModePreference>(this.getInitialPreference());
  private readonly _systemMode = signal<ColorMode>(this.getInitialSystemMode());

  readonly preference = this._preference.asReadonly();
  readonly systemMode = this._systemMode.asReadonly();
  readonly mode = computed<ColorMode>(() => {
    const preference = this._preference();
    return preference === 'system' ? this._systemMode() : preference;
  });

  constructor() {
    this.watchSystemMode();

    effect(() => {
      this.applyMode(this.mode());
    });
  }

  setPreference(preference: ColorModePreference): void {
    this._preference.set(preference);

    if (preference === 'system') {
      this.storage.removeItem(COLOR_MODE_STORAGE_KEY);
      return;
    }

    this.storage.setItem(COLOR_MODE_STORAGE_KEY, preference);
  }

  toggle(): void {
    this.setPreference(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private getInitialPreference(): ColorModePreference {
    const storedPreference = this.storage.getItem(COLOR_MODE_STORAGE_KEY);

    if (this.isColorModePreference(storedPreference)) {
      return storedPreference;
    }

    return 'system';
  }

  private getInitialSystemMode(): ColorMode {
    return this.mediaQuery?.matches ? 'dark' : 'light';
  }

  private getMediaQuery(): MediaQueryList | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const matchMedia = this.document.defaultView?.matchMedia;
    return typeof matchMedia === 'function' ? matchMedia.call(this.document.defaultView, '(prefers-color-scheme: dark)') : null;
  }

  private watchSystemMode(): void {
    if (!this.mediaQuery) {
      return;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      this._systemMode.set(event.matches ? 'dark' : 'light');
    };

    this.mediaQuery.addEventListener('change', handleChange);
    this.destroyRef.onDestroy(() => this.mediaQuery?.removeEventListener('change', handleChange));
  }

  private applyMode(mode: ColorMode): void {
    this.document.documentElement.dataset['theme'] = mode;
  }

  private isColorModePreference(value: string | null): value is ColorModePreference {
    return value === 'light' || value === 'dark' || value === 'system';
  }
}
