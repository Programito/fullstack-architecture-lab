import { TestBed } from '@angular/core/testing';
import { fireEvent, render, within } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../../../shared/utils/storage/key-value-storage';
import type { ReadinessStatusDto } from '../../api/identity-api.models';
import { IdentityApiService } from '../../api/identity-api.service';
import { PlatformReadinessService } from '../../api/platform-readiness.service';
import { IdentitySessionStore } from '../../identity-session.store';
import { DeveloperPage } from './developer-page';

describe('DeveloperPage', () => {
  type DeveloperResourcesStream = Observable<{
    storybookUrl: string;
    apiDocsUrl: string;
    architectureUrl: string;
  }>;

  const renderPage = async ({
    resources$ = of({
      storybookUrl: '/developer/storybook/',
      apiDocsUrl: '/developer/api-docs/',
      architectureUrl: '/developer/architecture/',
    }),
    logout = vi.fn(() => of(undefined)),
    readiness$ = of({ status: 'ready', database: 'ready', durationMs: 42 } satisfies ReadinessStatusDto),
  }: {
    resources$?: DeveloperResourcesStream;
    logout?: ReturnType<typeof vi.fn>;
    readiness$?: Observable<ReadinessStatusDto>;
  } = {}) => {
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
      getDeveloperResources: vi.fn(() => resources$),
      logout,
    };
    const readiness = {
      watch: vi.fn(() => readiness$),
    };

    const result = await render(DeveloperPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: PlatformReadinessService, useValue: readiness },
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

  it('shows the shared spinner while developer resources are loading', async () => {
    const resources$ = new Subject<{
      storybookUrl: string;
      apiDocsUrl: string;
      architectureUrl: string;
    }>();

    const { container } = await renderPage({ resources$ });
    const page = within(container);

    expect(page.getByRole('status')).toBeTruthy();
    expect(page.getByText('Cargando recursos...')).toBeTruthy();
    expect(page.queryAllByRole('link')).toHaveLength(0);

    resources$.next({
      storybookUrl: '/developer/storybook/',
      apiDocsUrl: '/developer/api-docs/',
      architectureUrl: '/developer/architecture/',
    });
    resources$.complete();

    expect(await page.findAllByRole('link')).toHaveLength(5);
    expect(page.getByText('Plataforma')).toBeTruthy();
    expect(page.getByText('Servicios operativos')).toBeTruthy();
    expect(page.queryByRole('status')).toBeNull();
  });

  it('renders developer resources and logs out in the background while navigating immediately', async () => {
    const logoutRequest = new Subject<void>();
    const logout = vi.fn(() => logoutRequest);
    const { storage, router, fixture, container } = await renderPage({ logout });
    const page = within(container);
    const navigateSpy = vi.spyOn(router, 'navigate');

    expect(page.getByRole('heading', { name: /Recursos para Developer/i })).toBeTruthy();
    expect(page.getAllByRole('link')).toHaveLength(5);
    expect(page.getByRole('link', { name: /API Docs/i }).getAttribute('href')).toBe('/developer/api-docs/');
    expect(page.getByRole('link', { name: /API Docs/i }).getAttribute('target')).toBe('_blank');
    expect(page.getByRole('link', { name: /API Docs/i }).getAttribute('rel')).toBe('noreferrer');
    expect(page.getByRole('link', { name: /Storybook/i }).getAttribute('href')).toBe('/developer/storybook/');
    expect(page.getByRole('link', { name: /Storybook/i }).getAttribute('target')).toBe('_blank');
    expect(page.getByRole('link', { name: /Storybook/i }).getAttribute('rel')).toBe('noreferrer');
    expect(page.getByRole('link', { name: /Arquitectura/i }).getAttribute('target')).toBe('_blank');
    expect(page.getByRole('link', { name: /Arquitectura/i }).getAttribute('rel')).toBe('noreferrer');
    const tablesLink = page.getAllByRole('link').find((link) => link.getAttribute('href') === '/developer/tables');
    expect(tablesLink).toBeTruthy();
    expect(tablesLink?.hasAttribute('target')).toBe(false);
    const logsLink = page.getAllByRole('link').find((link) => link.getAttribute('href') === '/developer/logs');
    expect(logsLink).toBeTruthy();
    expect(logsLink?.hasAttribute('target')).toBe(false);
    expect(page.getByText('Base de datos lista para responder.')).toBeTruthy();

    const logoutButton = page.getByRole('button', { name: /Cerrar sesi.n/i });
    fireEvent.click(logoutButton);
    fixture.detectChanges();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(storage.getItem('identity.session')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows a warning platform banner and opens logs when the database is warming up', async () => {
    const { router, container } = await renderPage({
      readiness$: of({ status: 'warming_up', database: 'warming_up', durationMs: 1800 }),
    });
    const page = within(container);
    const navigateSpy = vi.spyOn(router, 'navigate');

    expect(page.getByText('Base de datos despertando')).toBeTruthy();
    expect(page.getByText('El primer acceso puede tardar unos segundos mientras la infraestructura vuelve a responder.')).toBeTruthy();

    fireEvent.click(page.getByRole('button', { name: 'Ver logs' }));

    expect(navigateSpy).toHaveBeenCalledWith(['/developer/logs']);
  });
});
