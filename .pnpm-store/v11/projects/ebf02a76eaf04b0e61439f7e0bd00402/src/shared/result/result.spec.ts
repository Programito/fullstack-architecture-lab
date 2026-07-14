import { describe, expect, it } from 'vitest';

import { err, isErr, isOk, ok } from './result';

describe('Result', () => {
  it('creates ok results', () => {
    const result = ok('created');

    expect(result).toEqual({ ok: true, value: 'created' });
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
  });

  it('creates err results', () => {
    const result = err({ code: 'task_not_found', message: 'Task not found.' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'task_not_found', message: 'Task not found.' },
    });
    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
  });
});
