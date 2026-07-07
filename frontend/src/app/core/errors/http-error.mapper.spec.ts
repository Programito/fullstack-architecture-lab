import { HttpErrorResponse } from '@angular/common/http';

import { mapHttpError } from './http-error.mapper';

describe('mapHttpError', () => {
  it('maps status 0 to a network error', () => {
    const error = new HttpErrorResponse({
      status: 0,
      error: new ProgressEvent('error'),
    });

    expect(mapHttpError(error)).toMatchObject({
      type: 'network',
      message: 'Could not connect to the server.',
      status: 0,
    });
  });

  it('maps validation errors and preserves backend messages', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        message: ['email must be an email', 'password must be longer'],
        statusCode: 400,
      },
    });

    expect(mapHttpError(error)).toMatchObject({
      type: 'validation',
      message: 'email must be an email password must be longer',
      status: 400,
    });
  });

  it('preserves the backend code for analytics range validation errors', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        code: 'invalid_analytics_range',
        message: 'Date range is invalid.',
        statusCode: 400,
      },
    });

    expect(mapHttpError(error)).toMatchObject({
      type: 'validation',
      code: 'invalid_analytics_range',
      message: 'Date range is invalid.',
      status: 400,
    });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
  ] as const)('maps status %s to %s', (status, type) => {
    const error = new HttpErrorResponse({
      status,
      error: { message: 'Backend message.' },
    });

    expect(mapHttpError(error)).toMatchObject({
      type,
      message: 'Backend message.',
      status,
    });
  });

  it('maps unknown errors to unexpected', () => {
    expect(mapHttpError(new Error('Boom'))).toMatchObject({
      type: 'unexpected',
      message: 'Something went wrong.',
    });
  });
});
