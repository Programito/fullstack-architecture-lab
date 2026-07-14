import type { ApplicationError } from './application-error';

export class ApplicationErrorException extends Error {
  readonly applicationError: ApplicationError;

  constructor(error: ApplicationError) {
    super(error.message);
    this.name = 'ApplicationErrorException';
    this.applicationError = error;
  }
}
