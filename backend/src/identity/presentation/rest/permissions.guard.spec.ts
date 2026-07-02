import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

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

function makeGuard(findUnique: ReturnType<typeof vi.fn> = vi.fn()) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride');
  const prisma = { restaurant: { findUnique } } as any;
  const guard = new PermissionsGuard(reflector, prisma);
  function withRequired(required: string[]) {
    (reflector.getAllAndOverride as ReturnType<typeof vi.spyOn>).mockReturnValue(required);
  }
  return { guard, withRequired, findUnique };
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
      const { guard, withRequired, findUnique } = makeGuard();
      withRequired(['service']);
      const auth = makeAuth({ restaurantPermissions: { [RESTAURANT_ID]: ['service', 'layout'] } });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).resolves.toBe(true);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException cuando el restaurante no tiene el permiso y no hay org scope', async () => {
      const { guard, withRequired, findUnique } = makeGuard();
      withRequired(['service']);
      const auth = makeAuth({ restaurantPermissions: { [RESTAURANT_ID]: ['layout'] } });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException sin consultar DB cuando la org no tiene permisos (caso developer)', async () => {
      const { guard, withRequired, findUnique } = makeGuard();
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: [] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('pasa por org scope cuando el restaurante pertenece a la organización del usuario', async () => {
      const findUnique = vi.fn().mockResolvedValue({ organizationId: ORG_ID });
      const { guard, withRequired } = makeGuard(findUnique);
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: ['service', 'layout'] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).resolves.toBe(true);
      expect(findUnique).toHaveBeenCalledWith({
        where: { id: RESTAURANT_ID },
        select: { organizationId: true },
      });
    });

    it('lanza ForbiddenException cuando el restaurante pertenece a otra organización', async () => {
      const findUnique = vi.fn().mockResolvedValue({ organizationId: 'org-otro' });
      const { guard, withRequired } = makeGuard(findUnique);
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: ['service'] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException cuando el restaurante no existe en DB', async () => {
      const findUnique = vi.fn().mockResolvedValue(null);
      const { guard, withRequired } = makeGuard(findUnique);
      withRequired(['service']);
      const auth = makeAuth({
        scopes: { organizations: [ORG_ID], restaurants: [] },
        organizationPermissions: { [ORG_ID]: ['service'] },
      });
      await expect(guard.canActivate(makeContext(auth, RESTAURANT_ID))).rejects.toThrow(ForbiddenException);
    });
  });
});
