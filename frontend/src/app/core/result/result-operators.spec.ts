import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';

import { toResult } from './result-operators';

describe('toResult', () => {
  it('maps emitted values to ok results', async () => {
    const result = await firstValueFrom(of('value').pipe(toResult()));

    expect(result).toEqual({
      ok: true,
      value: 'value',
    });
  });

  it('maps observable errors to err results', async () => {
    const result = await firstValueFrom(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'User not found.' },
          }),
      ).pipe(toResult()),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        type: 'not-found',
        message: 'User not found.',
        status: 404,
        code: undefined,
        details: { message: 'User not found.' },
      },
    });
  });
});
