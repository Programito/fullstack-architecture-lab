import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import type { RestaurantReadRepository } from '../../../restaurants/application/ports/restaurant-read-repository.port';
import type { AuthenticatedRequest } from './auth.guard';
import { PermissionsGuard } from './permissions.guard';

const RESTAURANT_ID = 'restaurant-centro';
const ORG_ID = 'org-demo';

function makeAuth(overrides: Partial<AuthenticatedRequest['auth']> = {}): AuthenticatedRequest['auth'] {
  return {
    userId: 'u1',
    sessionId: 's1',
    accountType: 'regular',
    roles: [],
    permissions: [],
    scopes: { organizations: [], restaurants: [] },
    restaurantPermissions: {},
    organizationPermissions: {},
    ...overrides,
  };
}

function makeContext(auth: AuthenticatedRequest['auth'], restaurantId?: string): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        auth,
        params: restaurantId !== undefined ? { id: restaurantId } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(listRestaurants: ReturnType<typeof vi.fn> = vi.fn()) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride');
  const restaurants = { listRestaurants } as unknown as RestaurantReadRepository;
  const guard = new PermissionsGuard(reflector, restaurants);
  function withRequired(required: string[]) {
    (reflector.getAllAndOverride as ReturnType<typeof vi.spyOn>).mockReturnValue(required);
  }
  return { guard, withRequired, listRestaurants };
}

describe('PermissionsGuard', () => {
  it('pasa cuando no hay permisos requeridos', async () => {
    const { guard, withRequired } = makeGuard();
    withRequired([]);
    const ctx = makeContext(makeAuth());
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  describe('sin restaurantId en params', () => {
    it('pasa cuando el usuario tiene el permiso requerido', async () => {
      const { guard, withRequired } = makeGuard();
      withRequired(['service']);
      const auth = makeAuth({ permissions: ['service', 'layout'] });
      await expect(guard.canActivate(makeContext(auth))).resolves.toBe(true);
    });

    it('lanza ForbiddenException cuando falta el permiso', async () => {
      const { guard, withRequired } = makeGuard();
      withRequired(['kitchen']);
      const auth = makeAuth({ permissions: ['service'] });
      await expect(guard.canActivate(makeContext(auth))).rejects.toThrow(ForbiddenException);
    });
  });

  describe('con restaurantId en params', () => {
    it('pasa cuando el restaurante tiene el permiso en restaurantPermissions', async () => {
      const { guard, withRequired, listRestaurants } = makeGuard();
      withRequired(['service']);
      const auth = makeAuth({ restaurantPermissions: { [RESTAURANT_ID]: ['service', 'layout'] } });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).resolves.toBe(true);
      expect(listRestaurants).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException cuando el restaurante no tiene el permiso y no hay org scope', async () => {
      const { guard, withRequired, listRestaurants } = makeGuard();
      withRequired(['service']);
      const auth = makeAuth({ restaurantPermissions: { [RESTAURANT_ID]: ['layout'] } });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
      expect(listRestaurants).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException sin consultar repositorio cuando la org no tiene permisos', async () => {
      const { guard, withRequired, listRestaurants } = makeGuard();
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: [] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
      expect(listRestaurants).not.toHaveBeenCalled();
    });

    it('pasa por org scope cuando el restaurante pertenece a la organizacion del usuario', async () => {
      const listRestaurants = vi.fn().mockResolvedValue([{ id: RESTAURANT_ID, organizationId: ORG_ID }]);
      const { guard, withRequired } = makeGuard(listRestaurants);
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: ['service', 'layout'] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).resolves.toBe(true);
      expect(listRestaurants).toHaveBeenCalledWith([RESTAURANT_ID], []);
    });

    it('lanza ForbiddenException cuando el restaurante pertenece a otra organizacion', async () => {
      const listRestaurants = vi.fn().mockResolvedValue([{ id: RESTAURANT_ID, organizationId: 'org-otro' }]);
      const { guard, withRequired } = makeGuard(listRestaurants);
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: ['service'] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException cuando el restaurante no existe', async () => {
      const listRestaurants = vi.fn().mockResolvedValue([]);
      const { guard, withRequired } = makeGuard(listRestaurants);
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: ['service'] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
    });
  });
});
