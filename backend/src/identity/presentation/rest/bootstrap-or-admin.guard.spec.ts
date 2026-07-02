import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

import type { UserRepository } from '../../application/ports/user-repository.port';
import type { User } from '../../domain/user.entity';
import type { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { BootstrapOrAdminGuard } from './bootstrap-or-admin.guard';

describe('BootstrapOrAdminGuard', () => {
  const buildContext = (request: Partial<AuthenticatedRequest>): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

  it('allows the request through when no user exists yet (first-run bootstrap)', async () => {
    const users = { findAll: vi.fn().mockResolvedValue([]) } as unknown as UserRepository;
    const authGuard = { canActivate: vi.fn() } as unknown as AuthGuard;
    const guard = new BootstrapOrAdminGuard(users, authGuard);

    const result = await guard.canActivate(buildContext({ headers: {} }));

    expect(result).toBe(true);
    expect(authGuard.canActivate).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests once at least one user exists', async () => {
    const users = { findAll: vi.fn().mockResolvedValue([{ id: 'user-1' } as User]) } as unknown as UserRepository;
    const authGuard = {
      canActivate: vi.fn().mockRejectedValue(new UnauthorizedException('Bearer token is required.')),
    } as unknown as AuthGuard;
    const guard = new BootstrapOrAdminGuard(users, authGuard);

    await expect(guard.canActivate(buildContext({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects authenticated requests without the admin role once at least one user exists', async () => {
    const users = { findAll: vi.fn().mockResolvedValue([{ id: 'user-1' } as User]) } as unknown as UserRepository;
    const request: Partial<AuthenticatedRequest> = { headers: {} };
    const authGuard = {
      canActivate: vi.fn().mockImplementation(async () => {
        request.auth = {
          userId: 'user-2',
          sessionId: 'session-1',
          accountType: 'regular',
          roles: ['waiter'],
          permissions: [],
          scopes: { organizations: [], restaurants: [] },
          restaurantPermissions: {},
          organizationPermissions: {},
        };
        return true;
      }),
    } as unknown as AuthGuard;
    const guard = new BootstrapOrAdminGuard(users, authGuard);

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('allows authenticated admin requests once at least one user exists', async () => {
    const users = { findAll: vi.fn().mockResolvedValue([{ id: 'user-1' } as User]) } as unknown as UserRepository;
    const request: Partial<AuthenticatedRequest> = { headers: {} };
    const authGuard = {
      canActivate: vi.fn().mockImplementation(async () => {
        request.auth = {
          userId: 'user-2',
          sessionId: 'session-1',
          accountType: 'regular',
          roles: ['admin'],
          permissions: [],
          scopes: { organizations: [], restaurants: [] },
          restaurantPermissions: {},
          organizationPermissions: {},
        };
        return true;
      }),
    } as unknown as AuthGuard;
    const guard = new BootstrapOrAdminGuard(users, authGuard);

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
  });
});
