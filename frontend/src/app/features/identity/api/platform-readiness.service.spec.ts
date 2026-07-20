import { TestBed } from '@angular/core/testing';
import { Subject, type Observable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReadinessStatusDto } from './identity-api.models';
import { IdentityApiService } from './identity-api.service';
import { PlatformReadinessService } from './platform-readiness.service';

describe('PlatformReadinessService', () => {
  const readyStatus: ReadinessStatusDto = { status: 'ready', database: 'ready', durationMs: 42 };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (getReadiness: () => Observable<ReadinessStatusDto>) => {
    const api = { getReadiness: vi.fn(getReadiness) };
    TestBed.configureTestingModule({
      providers: [{ provide: IdentityApiService, useValue: api }],
    });

    return {
      api,
      service: TestBed.inject(PlatformReadinessService),
    };
  };

  it('emits warming up while the readiness request is still pending after the delay', () => {
    const readinessRequest = new Subject<ReadinessStatusDto>();
    const { service } = setup(() => readinessRequest.asObservable());
    const emissions: ReadinessStatusDto[] = [];

    service.watch({ stopWhenReady: true }).subscribe((status) => emissions.push(status));

    vi.advanceTimersByTime(1_499);
    expect(emissions).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(emissions).toEqual([{ status: 'warming_up', database: 'warming_up', durationMs: 0 }]);

    readinessRequest.next(readyStatus);
    readinessRequest.complete();

    expect(emissions).toEqual([{ status: 'warming_up', database: 'warming_up', durationMs: 0 }, readyStatus]);
  });

  it('keeps a slow readiness request alive instead of replacing it on the next poll tick', () => {
    const readinessRequest = new Subject<ReadinessStatusDto>();
    const { api, service } = setup(() => readinessRequest.asObservable());
    const emissions: ReadinessStatusDto[] = [];

    service.watch().subscribe((status) => emissions.push(status));

    vi.advanceTimersByTime(5_000);

    expect(api.getReadiness).toHaveBeenCalledTimes(1);

    readinessRequest.next(readyStatus);
    readinessRequest.complete();

    expect(emissions).toEqual([{ status: 'warming_up', database: 'warming_up', durationMs: 0 }, readyStatus]);

    vi.advanceTimersByTime(5_000);
    expect(api.getReadiness).toHaveBeenCalledTimes(2);
  });

  it('does not show the pending fallback when readiness answers quickly', () => {
    const { service } = setup(() => of(readyStatus));
    const emissions: ReadinessStatusDto[] = [];

    service.watch({ stopWhenReady: true }).subscribe((status) => emissions.push(status));

    vi.advanceTimersByTime(1_500);

    expect(emissions).toEqual([readyStatus]);
  });
});
