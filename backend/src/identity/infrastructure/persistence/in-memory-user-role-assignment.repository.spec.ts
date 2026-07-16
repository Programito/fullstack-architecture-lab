import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryUserRoleAssignmentRepository } from './in-memory-user-role-assignment.repository';
import { InMemoryUserRepository } from './in-memory-user.repository';
import { InMemoryRoleRepository } from './in-memory-role.repository';
import { User } from '../../domain/user.entity';
import { Role } from '../../domain/role.entity';

describe('InMemoryUserRoleAssignmentRepository', () => {
  let users: InMemoryUserRepository;
  let roles: InMemoryRoleRepository;
  let repository: InMemoryUserRoleAssignmentRepository;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    roles = new InMemoryRoleRepository();
    repository = new InMemoryUserRoleAssignmentRepository(users, roles);
  });

  it('returns an explicitly assigned scope instead of the role-name-based fallback', async () => {
    const role = Role.create({ name: 'waiter', permissionIds: [] });
    await roles.save(role);
    const user = User.create({ email: 'a@example.com', firstName: 'A', lastName: 'B', passwordHash: 'x', roleIds: [role.id] });
    await users.save(user);

    await repository.replaceScopeForUser(user.id, [role.id], { organizationId: 'org-real', restaurantId: 'rest-real' });

    const assignments = await repository.findByUserId(user.id);
    expect(assignments).toEqual([
      {
        id: `${user.id}:${role.id}:restaurant`,
        userId: user.id,
        roleId: role.id,
        scopeType: 'restaurant',
        organizationId: 'org-real',
        restaurantId: 'rest-real',
      },
    ]);
  });

  it('falls back to the demo role-name derivation when no explicit scope was assigned', async () => {
    const role = Role.create({ name: 'waiter', permissionIds: [] });
    await roles.save(role);
    const user = User.create({ email: 'a@example.com', firstName: 'A', lastName: 'B', passwordHash: 'x', roleIds: [role.id] });
    await users.save(user);

    const assignments = await repository.findByUserId(user.id);

    expect(assignments).toEqual([
      expect.objectContaining({ scopeType: 'restaurant', organizationId: 'org-demo', restaurantId: 'restaurant-mesaflow-centro' }),
    ]);
  });

  it('grants the customer (mobile) role restaurant scope, matching waiter/kitchen', async () => {
    const role = Role.create({ name: 'customer', permissionIds: [] });
    await roles.save(role);
    const user = User.create({ email: 'c@example.com', firstName: 'C', lastName: 'D', passwordHash: 'x', roleIds: [role.id] });
    await users.save(user);

    const assignments = await repository.findByUserId(user.id);

    expect(assignments).toEqual([
      expect.objectContaining({ scopeType: 'restaurant', organizationId: 'org-demo', restaurantId: 'restaurant-mesaflow-centro' }),
    ]);
  });
});
