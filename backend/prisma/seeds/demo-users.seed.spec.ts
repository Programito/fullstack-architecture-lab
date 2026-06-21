import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { DEMO_ACCOUNT_CATALOG } from '../../src/identity/domain/demo-account-catalog';
import { seedDemoUsers } from './demo-users.seed';

describe('seedDemoUsers', () => {
  it('creates demo users with scoped role assignments without dropping legacy user roles', async () => {
    const roleFindMany = vi.fn().mockResolvedValue(
      DEMO_ACCOUNT_CATALOG.map((account, index) => ({ id: `role-${index}`, name: account.role })),
    );
    const userUpsert = vi.fn().mockImplementation(async ({ where }: { where: { email: string } }) => ({
      id: `user-${where.email}`,
      email: where.email,
    }));
    const userRoleDeleteMany = vi.fn().mockResolvedValue(undefined);
    const userRoleCreate = vi.fn().mockResolvedValue(undefined);
    const userRoleAssignmentDeleteMany = vi.fn().mockResolvedValue(undefined);
    const userRoleAssignmentCreateMany = vi.fn().mockResolvedValue(undefined);
    const organizationFindUnique = vi.fn().mockResolvedValue({ id: 'org-demo' });
    const restaurantFindFirst = vi.fn().mockResolvedValue({ id: 'rest-demo', organizationId: 'org-demo' });
    const prisma = {
      role: { findMany: roleFindMany },
      user: { upsert: userUpsert },
      userRole: { deleteMany: userRoleDeleteMany, create: userRoleCreate },
      userRoleAssignment: { deleteMany: userRoleAssignmentDeleteMany, createMany: userRoleAssignmentCreateMany },
      organization: { findUnique: organizationFindUnique },
      restaurant: { findFirst: restaurantFindFirst },
    } as unknown as PrismaClient;

    await seedDemoUsers(prisma);

    expect(roleFindMany).toHaveBeenCalledTimes(1);
    expect(userUpsert).toHaveBeenCalledTimes(DEMO_ACCOUNT_CATALOG.length);
    expect(userRoleDeleteMany).toHaveBeenCalledTimes(DEMO_ACCOUNT_CATALOG.length);
    expect(userRoleCreate).toHaveBeenCalledTimes(DEMO_ACCOUNT_CATALOG.length);
    expect(userRoleAssignmentDeleteMany).toHaveBeenCalledTimes(DEMO_ACCOUNT_CATALOG.length);
    expect(userRoleAssignmentCreateMany).toHaveBeenCalledTimes(DEMO_ACCOUNT_CATALOG.length);
    expect(organizationFindUnique).toHaveBeenCalledWith({ where: { name: 'MesaFlow Demo' } });
    expect(restaurantFindFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org-demo', name: 'MesaFlow Centro' },
    });
    expect(userRoleAssignmentCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          scopeType: 'restaurant',
          organizationId: 'org-demo',
          restaurantId: 'rest-demo',
        }),
      ]),
    });
  });
});
