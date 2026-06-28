import { Injectable } from '@nestjs/common';

import type { UserRoleAssignmentRecord, UserRoleAssignmentRepository } from '../../application/ports/user-role-assignment-repository.port';
import { DEMO_ACCOUNT_CATALOG } from '../../domain/demo-account-catalog';
import type { RoleName } from '../../domain/role-catalog';
import { InMemoryUserRepository } from './in-memory-user.repository';
import { InMemoryRoleRepository } from './in-memory-role.repository';

const DEMO_ORGANIZATION_ID = 'org-demo';
const DEMO_RESTAURANT_ID = 'restaurant-mesaflow-centro';

@Injectable()
export class InMemoryUserRoleAssignmentRepository implements UserRoleAssignmentRepository {
  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly roles: InMemoryRoleRepository,
  ) {}

  async findByUserId(userId: string): Promise<UserRoleAssignmentRecord[]> {
    const [user, allRoles] = await Promise.all([this.users.findById(userId), this.roles.findAll()]);
    if (!user) {
      return [];
    }

    const roleNameById = new Map(allRoles.map((role) => [role.id, role.name]));

    return user.roleIds.flatMap((roleId) => {
      const roleName = roleNameById.get(roleId) as RoleName | undefined;
      if (!roleName) {
        return [];
      }

      return this.createAssignments(user.id, roleId, roleName);
    });
  }

  private createAssignments(userId: string, roleId: string, roleName: RoleName): UserRoleAssignmentRecord[] {
    if (roleName === 'admin' || roleName === 'manager') {
      return [
        {
          id: `${userId}:${roleId}:organization`,
          userId,
          roleId,
          scopeType: 'organization',
          organizationId: DEMO_ORGANIZATION_ID,
          restaurantId: null,
        },
        {
          id: `${userId}:${roleId}:restaurant`,
          userId,
          roleId,
          scopeType: 'restaurant',
          organizationId: DEMO_ORGANIZATION_ID,
          restaurantId: DEMO_RESTAURANT_ID,
        },
      ];
    }

    if (roleName === 'waiter' || roleName === 'kitchen') {
      return [
        {
          id: `${userId}:${roleId}:restaurant`,
          userId,
          roleId,
          scopeType: 'restaurant',
          organizationId: DEMO_ORGANIZATION_ID,
          restaurantId: DEMO_RESTAURANT_ID,
        },
      ];
    }

    const isDemoDeveloper = DEMO_ACCOUNT_CATALOG.some((account) => account.role === 'developer');
    if (roleName === 'developer' && isDemoDeveloper) {
      return [
        {
          id: `${userId}:${roleId}:organization`,
          userId,
          roleId,
          scopeType: 'organization',
          organizationId: DEMO_ORGANIZATION_ID,
          restaurantId: null,
        },
      ];
    }

    return [];
  }
}
