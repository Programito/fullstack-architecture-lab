import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<Email, ApplicationError> {
    const normalized = raw.trim().toLowerCase();

    if (!isValidEmail(normalized)) {
      return err(applicationError('invalid_email', 'Email must be a valid email address.'));
    }

    return ok(new Email(normalized));
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
