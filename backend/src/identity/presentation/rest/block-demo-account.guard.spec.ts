import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { BlockDemoAccountGuard } from './block-demo-account.guard';

function makeContext(auth?: { accountType: string }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ auth }),
    }),
  } as never;
}

describe('BlockDemoAccountGuard', () => {
  it('denies the request when the authenticated account is a demo account', () => {
    const guard = new BlockDemoAccountGuard();
    expect(() => guard.canActivate(makeContext({ accountType: 'demo' }))).toThrow(ForbiddenException);
  });

  it('allows the request when the authenticated account is regular', () => {
    const guard = new BlockDemoAccountGuard();
    expect(guard.canActivate(makeContext({ accountType: 'regular' }))).toBe(true);
  });

  it('allows the request when there is no authenticated actor yet (bootstrap flow)', () => {
    const guard = new BlockDemoAccountGuard();
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });
});
