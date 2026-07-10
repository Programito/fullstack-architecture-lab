import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { API_BASE_URL } from '../api/api.config';
import { ClientLogsService, clientLogHttpInterceptor } from './client-logs.service';
import { CLIENT_ORIGIN_HEADER } from './client-origin';
import { IdentitySessionStore } from '../../features/identity/identity-session.store';

describe('ClientLogsService', () => {
  it('sends a lightweight event when navigation completes', () => {
    const events$ = new Subject<unknown>();
    const post = vi.fn(() => ({ subscribe: ({ next }: { next?: () => void }) => next?.() }));

    TestBed.configureTestingModule({
      providers: [
        ClientLogsService,
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { post } },
        { provide: Router, useValue: { events: events$, url: '/developer' } },
        { provide: IdentitySessionStore, useValue: { session: () => ({ accessToken: 'token' }) } },
      ],
    });

    const service = TestBed.inject(ClientLogsService);
    service.start();
    events$.next(new NavigationEnd(1, '/developer', '/developer/logs'));

    expect(post).toHaveBeenCalledWith('/api/v1/observability/client-events', expect.objectContaining({
      event: 'frontend.navigation',
      path: '/developer/logs',
      metadata: expect.objectContaining({ clientOrigin: 'web-admin' }),
    }));
  });

  it('does not send client events when the user is not authenticated', () => {
    const post = vi.fn(() => ({ subscribe: ({ next }: { next?: () => void }) => next?.() }));

    TestBed.configureTestingModule({
      providers: [
        ClientLogsService,
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { post } },
        { provide: Router, useValue: { events: new Subject<unknown>(), url: '/login' } },
        { provide: IdentitySessionStore, useValue: { session: () => ({ accessToken: null }) } },
      ],
    });

    const service = TestBed.inject(ClientLogsService);
    service.log({
      level: 'info',
      event: 'frontend.navigation',
      message: 'Navigation to /login',
      path: '/login',
    });

    expect(post).not.toHaveBeenCalled();
  });

  it('annotates API errors with the current client origin', () => {
    const post = vi.fn(() => ({ subscribe: ({ next }: { next?: () => void }) => next?.() }));

    TestBed.configureTestingModule({
      providers: [
        ClientLogsService,
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { post } },
        { provide: Router, useValue: { events: new Subject<unknown>(), url: '/restaurant-pos/service' } },
        { provide: IdentitySessionStore, useValue: { session: () => ({ accessToken: 'token' }) } },
      ],
    });

    const service = TestBed.inject(ClientLogsService);
    service.logHttpError({ status: 500, url: '/api/v1/restaurants/r1/orders' } as never);

    expect(post).toHaveBeenCalledWith('/api/v1/observability/client-events', expect.objectContaining({
      metadata: expect.objectContaining({ clientOrigin: 'web-pos' }),
    }));
  });
});

describe('clientLogHttpInterceptor', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([clientLogHttpInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { url: '/restaurant-pos/menu' } },
      ],
    });

    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('adds the client origin header to same-origin API requests', () => {
    const { http, backend } = setup();

    http.get('/api/v1/restaurants').subscribe();

    const request = backend.expectOne('/api/v1/restaurants');
    expect(request.request.headers.has(CLIENT_ORIGIN_HEADER)).toBe(true);
    request.flush({});
    backend.verify();
  });

  it('does not add the client origin header to cross-origin requests, to avoid a CORS preflight rejection', () => {
    const { http, backend } = setup();

    http.post('https://api.cloudinary.com/v1_1/demo-cloud/image/upload', new FormData()).subscribe();

    const request = backend.expectOne('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    expect(request.request.headers.has(CLIENT_ORIGIN_HEADER)).toBe(false);
    request.flush({});
    backend.verify();
  });
});
