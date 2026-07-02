import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { API_BASE_URL } from '../api/api.config';
import { ClientLogsService } from './client-logs.service';
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
});
