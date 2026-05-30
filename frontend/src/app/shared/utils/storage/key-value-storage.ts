import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class LocalKeyValueStorage implements KeyValueStorage {
  constructor(private readonly storage: Storage) {}

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }
}

export class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

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

export const KEY_VALUE_STORAGE = new InjectionToken<KeyValueStorage>('KEY_VALUE_STORAGE', {
  providedIn: 'root',
  factory: () => {
    const platformId = inject(PLATFORM_ID);
    const document = inject(DOCUMENT);

    if (!isPlatformBrowser(platformId)) {
      return new MemoryKeyValueStorage();
    }

    try {
      const storage = document.defaultView?.localStorage;
      return storage ? new LocalKeyValueStorage(storage) : new MemoryKeyValueStorage();
    } catch {
      return new MemoryKeyValueStorage();
    }
  },
});
