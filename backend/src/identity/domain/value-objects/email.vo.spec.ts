import { describe, expect, it } from 'vitest';

import { isErr, isOk } from '../../../shared/result/result';
import { Email } from './email.vo';

describe('Email', () => {
  it('accepts valid emails', () => {
    const result = Email.create('user@example.com');

    expect(isOk(result)).toBe(true);
    if (isErr(result)) {
      throw new Error('Expected email to be valid.');
    }
    expect(result.value.value).toBe('user@example.com');
  });

  it('normalizes spaces and casing', () => {
    const result = Email.create(' USER@Example.COM ');

    expect(isOk(result)).toBe(true);
    if (isErr(result)) {
      throw new Error('Expected email to be valid.');
    }
    expect(result.value.value).toBe('user@example.com');
  });

  it('rejects invalid emails', () => {
    const result = Email.create('invalid-email');

    expect(isErr(result)).toBe(true);
    if (isOk(result)) {
      throw new Error('Expected email to be invalid.');
    }
    expect(result.error.code).toBe('invalid_email');
  });
});
