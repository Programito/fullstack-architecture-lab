import { catchError, map, of, type Observable, type OperatorFunction } from 'rxjs';

import { mapHttpError } from '../errors/http-error.mapper';
import { err, ok, type Result } from './result';

export function toResult<T>(): OperatorFunction<T, Result<T>> {
  return (source: Observable<T>) =>
    source.pipe(
      map((value) => ok(value)),
      catchError((error: unknown) => of(err(mapHttpError(error)))),
    );
}
