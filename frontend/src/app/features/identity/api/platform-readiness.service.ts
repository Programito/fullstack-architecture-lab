import { inject, Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeWhile } from 'rxjs/operators';

import type { ReadinessStatusDto } from './identity-api.models';
import { IdentityApiService } from './identity-api.service';

const READINESS_POLL_INTERVAL_MS = 5_000;

@Injectable({
  providedIn: 'root',
})
export class PlatformReadinessService {
  private readonly api = inject(IdentityApiService);

  watch(options?: { stopWhenReady?: boolean }): Observable<ReadinessStatusDto> {
    const stopWhenReady = options?.stopWhenReady ?? false;
    const stream = timer(0, READINESS_POLL_INTERVAL_MS).pipe(
      switchMap(() =>
        this.api.getReadiness().pipe(
          catchError(() =>
            of({
              status: 'warming_up',
              database: 'warming_up',
              durationMs: 0,
            } satisfies ReadinessStatusDto),
          ),
        ),
      ),
      distinctUntilChanged((left, right) => left.status === right.status && left.database === right.database),
      map((result) => result),
    );

    return stopWhenReady ? stream.pipe(takeWhile((result) => result.status !== 'ready', true)) : stream;
  }
}
