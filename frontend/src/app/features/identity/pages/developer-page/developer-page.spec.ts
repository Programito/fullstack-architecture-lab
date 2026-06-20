import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../../../shared/utils/storage/key-value-storage';
import { IdentityApiService } from '../../api/identity-api.service';
import { IdentitySessionStore } from '../../identity-session.store';
import { DeveloperPage } from './developer-page';

describe('DeveloperPage', () => {
  const renderPage = async (logout = vi.fn(() => of(undefined))) => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem('locale', 'es');
    storage.setItem(
      'identity.session',
      JSON.stringify({
        userId: 'developer-1',
        roles: ['developer'],
        permissions: [],
        accessToken: 'token',
      }),
    );

    const i18n = provideI18nTesting();
    const api = {
      getDeveloperResources: vi.fn(() => of({
        storybookUrl: '/developer/storybook/',
        apiDocsUrl: '/developer/api-docs/',
        architectureUrl: '/developer/architecture/',
      })),
      logout,
    };

    const result = await render(DeveloperPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        provideRouter([]),
      ],
    });

    return {
      ...result,
      storage,
      logout,
      router: TestBed.inject(Router),
      session: TestBed.inject(IdentitySessionStore),
    };
  };

  it('renders developer resources and transitions on logout', async () => {
    vi.useFakeTimers();
    const logout = vi.fn(() => of(undefined));
    const { storage, router, fixture } = await renderPage(logout);
    const navigateSpy = vi.spyOn(router, 'navigate');

    expect(screen.getByRole('heading', { name: /Recursos para Developer/i })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Abrir recurso/i })).toHaveLength(3);

    const logoutButton = screen.getByRole('button', { name: /Cerrar sesi.n/i });
    fireEvent.click(logoutButton);
    fixture.detectChanges();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(logoutButton.getAttribute('aria-busy')).toBe('true');

    await vi.advanceTimersByTimeAsync(180);

    expect(storage.getItem('identity.session')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);

    vi.useRealTimers();
  });
});
