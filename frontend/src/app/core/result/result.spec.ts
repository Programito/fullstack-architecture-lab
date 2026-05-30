import { err, isErr, isOk, ok } from './result';

describe('result', () => {
  it('creates ok results', () => {
    const result = ok('value');

    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);

    if (isOk(result)) {
      expect(result.value).toBe('value');
    }
  });

  it('creates err results', () => {
    const result = err({ type: 'unexpected' as const, message: 'Something went wrong.' });

    expect(isErr(result)).toBe(true);
    expect(isOk(result)).toBe(false);

    if (isErr(result)) {
      expect(result.error.message).toBe('Something went wrong.');
    }
  });
});
