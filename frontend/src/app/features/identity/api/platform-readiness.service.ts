import { inject, Injectable } from '@angular/core';
import { merge, Observable, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, exhaustMap, map, share, takeUntil, takeWhile } from 'rxjs/operators';

import type { ReadinessStatusDto } from './identity-api.models';
import { IdentityApiService } from './identity-api.service';

const READINESS_POLL_INTERVAL_MS = 5_000;
const READINESS_PENDING_DELAY_MS = 1_500;
const WARMING_UP_STATUS: ReadinessStatusDto = {
  status: 'warming_up',
  database: 'warming_up',
  durationMs: 0,
};

@Injectable({
  providedIn: 'root',
})
export class PlatformReadinessService {
  private readonly api = inject(IdentityApiService);

  watch(options?: { stopWhenReady?: boolean }): Observable<ReadinessStatusDto> {
    const stopWhenReady = options?.stopWhenReady ?? false;
    const stream = timer(0, READINESS_POLL_INTERVAL_MS).pipe(
      exhaustMap(() => this.checkReadiness()),
      distinctUntilChanged((left, right) => left.status === right.status && left.database === right.database),
      map((result) => result),
    );

    return stopWhenReady ? stream.pipe(takeWhile((result) => result.status !== 'ready', true)) : stream;
  }

  private checkReadiness(): Observable<ReadinessStatusDto> {
    const readinessRequest = this.api.getReadiness().pipe(
      catchError(() => of(WARMING_UP_STATUS)),
      share(),
    );
    const pendingFallback = timer(READINESS_PENDING_DELAY_MS).pipe(
      map(() => WARMING_UP_STATUS),
      takeUntil(readinessRequest),
    );

    return merge(pendingFallback, readinessRequest);
  }
}
