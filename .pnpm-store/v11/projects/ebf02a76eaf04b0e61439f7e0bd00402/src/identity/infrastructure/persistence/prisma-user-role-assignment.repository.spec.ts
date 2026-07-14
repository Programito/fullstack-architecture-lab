import { describe, expect, it, vi } from 'vitest';

import { PrismaUserRoleAssignmentRepository } from './prisma-user-role-assignment.repository';
import type { PrismaService } from '../../../shared/prisma/prisma.service';

describe('PrismaUserRoleAssignmentRepository.replaceScopeForUser', () => {
  it('replaces the user scoped assignments with restaurant-scoped rows for each role, inside a transaction', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = { userRoleAssignment: { deleteMany, createMany } };
    const prisma = {
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;
    const repository = new PrismaUserRoleAssignmentRepository(prisma);

    await repository.replaceScopeForUser('user-1', ['role-a', 'role-b'], {
      organizationId: 'org-1',
      restaurantId: 'rest-1',
    });

    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', roleId: 'role-a', scopeType: 'restaurant', organizationId: 'org-1', restaurantId: 'rest-1' },
        { userId: 'user-1', roleId: 'role-b', scopeType: 'restaurant', organizationId: 'org-1', restaurantId: 'rest-1' },
      ],
    });
  });

  it('creates organization-scoped rows when no restaurant is given', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { userRoleAssignment: { deleteMany, createMany } };
    const prisma = {
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;
    const repository = new PrismaUserRoleAssignmentRepository(prisma);

    await repository.replaceScopeForUser('user-1', ['role-a'], { organizationId: 'org-1', restaurantId: null });

    expect(createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', roleId: 'role-a', scopeType: 'organization', organizationId: 'org-1', restaurantId: null }],
    });
  });
});
