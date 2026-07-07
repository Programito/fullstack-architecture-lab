import { ConfigService } from '@nestjs/config';

import type { AuthResult } from '../../application/use-cases/auth.service';
import { AuthController } from './auth.controller';

function createAuthResult(overrides: Partial<AuthResult> = {}): AuthResult {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessExpiresIn: 900,
    user: {
      id: 'user-1',
      email: 'developer@mesaflow.demo',
      firstName: 'Dev',
      lastName: 'User',
      passwordHash: 'hash',
      enabled: true,
      accountType: 'demo',
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    },
    permissions: ['service'],
    roles: ['developer'],
    scopes: { organizations: ['org-demo'], restaurants: ['restaurant-demo'] },
    ...overrides,
  };
}

describe('AuthController', () => {
  it('records web-admin as clientOrigin on credential login success', async () => {
    const login = vi.fn().mockResolvedValue(createAuthResult());
    const auditRecord = vi.fn().mockResolvedValue(undefined);
    const response = { cookie: vi.fn(), clearCookie: vi.fn() };
    const controller = new AuthController(
      { login } as never,
      { accessTtlSeconds: 900, refreshTtlSeconds: 604800 } as never,
      new ConfigService({ AUTH_COOKIE_SECURE: 'false' }),
      { record: auditRecord } as never,
      {} as never,
    );

    await controller.login(
      { email: 'developer@mesaflow.demo', password: 'supersecret' },
      { headers: {}, originalUrl: '/api/v1/auth/login', method: 'POST' },
      response,
    );

    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      event: 'auth.login.succeeded',
      metadata: expect.objectContaining({ clientOrigin: 'web-admin' }),
    }));
  });

  it('records apk-customer as clientOrigin on demo login when the mobile header is present', async () => {
    const demoLogin = vi.fn().mockResolvedValue(createAuthResult({ roles: ['customer'] }));
    const auditRecord = vi.fn().mockResolvedValue(undefined);
    const response = { cookie: vi.fn(), clearCookie: vi.fn() };
    const controller = new AuthController(
      { demoLogin } as never,
      { accessTtlSeconds: 900, refreshTtlSeconds: 604800 } as never,
      new ConfigService({ AUTH_COOKIE_SECURE: 'false' }),
      { record: auditRecord } as never,
      {} as never,
    );

    await controller.demoLogin(
      { role: 'developer' },
      { headers: { 'x-client-origin': 'apk-customer' }, originalUrl: '/api/v1/auth/demo-login', method: 'POST' },
      response,
    );

    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      event: 'auth.demo-login.succeeded',
      metadata: expect.objectContaining({ clientOrigin: 'apk-customer' }),
    }));
  });
});
