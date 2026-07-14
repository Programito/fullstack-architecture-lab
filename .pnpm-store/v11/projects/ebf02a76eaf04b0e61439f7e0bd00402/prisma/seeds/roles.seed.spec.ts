import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { ROLE_CATALOG } from '../../src/identity/domain/role-catalog';
import { seedRoles } from './roles.seed';

describe('seedRoles', () => {
  it('upserts every shared role and refreshes role-permission assignments idempotently', async () => {
    const roleUpsert = vi.fn().mockResolvedValue(undefined);
    const roleFindMany = vi.fn().mockResolvedValue(ROLE_CATALOG.map((role, index) => ({ id: `role-${index}`, name: role.name })));
    const permissionFindMany = vi.fn().mockResolvedValue([
      { id: 'permission-service', name: 'service' },
      { id: 'permission-menu', name: 'menu' },
      { id: 'permission-kitchen', name: 'kitchen' },
      { id: 'permission-layout', name: 'layout' },
      { id: 'permission-reservations', name: 'reservations' },
    ]);
    const rolePermissionDeleteMany = vi.fn().mockResolvedValue(undefined);
    const rolePermissionCreateMany = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      role: { upsert: roleUpsert, findMany: roleFindMany },
      permission: { findMany: permissionFindMany },
      rolePermission: { deleteMany: rolePermissionDeleteMany, createMany: rolePermissionCreateMany },
    } as unknown as PrismaClient;

    await seedRoles(prisma);
    await seedRoles(prisma);

    expect(roleUpsert).toHaveBeenCalledTimes(ROLE_CATALOG.length * 2);
    expect(rolePermissionDeleteMany).toHaveBeenCalledTimes(ROLE_CATALOG.length * 2);
    for (const role of ROLE_CATALOG) {
      expect(roleUpsert).toHaveBeenCalledWith({
        where: { name: role.name },
        update: { description: role.description },
        create: {
          name: role.name,
          description: role.description,
        },
      });
    }

    expect(rolePermissionCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          { roleId: 'role-0', permissionId: 'permission-reservations' },
        ]),
      }),
    );
  });
});
