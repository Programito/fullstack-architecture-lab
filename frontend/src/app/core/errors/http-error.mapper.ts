import { HttpErrorResponse } from '@angular/common/http';

import type { AppError, AppErrorType } from './app-error';

type ErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
};

const HTTP_ERROR_TYPES: Record<number, AppErrorType> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
};

const DEFAULT_MESSAGES: Record<AppErrorType, string> = {
  network: 'Could not connect to the server.',
  validation: 'Some fields are invalid.',
  unauthorized: 'You need to sign in to continue.',
  forbidden: 'You do not have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  conflict: 'The request conflicts with the current state.',
  unexpected: 'Something went wrong.',
};

export function mapHttpError(error: unknown): AppError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      type: 'unexpected',
      message: DEFAULT_MESSAGES.unexpected,
      details: error,
    };
  }

  if (error.status === 0) {
    return {
      type: 'network',
      message: DEFAULT_MESSAGES.network,
      status: error.status,
      details: error.error,
    };
  }

  const body = asErrorBody(error.error);
  const type = HTTP_ERROR_TYPES[error.status] ?? 'unexpected';

  return {
    type,
    message: getMessage(body) ?? DEFAULT_MESSAGES[type],
    status: error.status,
    code: body?.code,
    details: body?.details ?? error.error,
  };
}

function asErrorBody(value: unknown): ErrorBody | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as ErrorBody;
}

function getMessage(body: ErrorBody | null): string | null {
  if (!body?.message) {
    return null;
  }

  if (Array.isArray(body.message)) {
    return body.message.join(' ');
  }

  return body.message;
}
