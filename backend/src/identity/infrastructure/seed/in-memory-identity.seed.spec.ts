import { describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../shared/events/in-memory-event-bus';
import type { FakeDataGenerator } from '../../../shared/fake-data/fake-data-generator.port';
import type { PasswordHasher } from '../../application/ports/password-hasher.port';
import { InMemoryPermissionRepository } from '../persistence/in-memory-permission.repository';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { AssignRolePermissionsUseCase } from '../../application/use-cases/assign-role-permissions.use-case';
import { PERMISSION_CATALOG } from '../../domain/permission-catalog';
import { ROLE_CATALOG } from '../../domain/role-catalog';
import { InMemoryRoleRepository } from '../persistence/in-memory-role.repository';
import { InMemoryUserRepository } from '../persistence/in-memory-user.repository';
import { InMemoryIdentitySeed } from './in-memory-identity.seed';

class TestConfig {
  constructor(private readonly values: Record<string, string>) {}

  get<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

class TestPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

class TestFakeDataGenerator implements FakeDataGenerator {
  private index = 0;

  personName(): string {
    this.index += 1;
    return `Demo User ${this.index}`;
  }

  email(): string {
    return `demo${this.index}@example.com`;
  }

  password(): string {
    return `demo-pass-${this.index}`;
  }

  roleDescription(roleName: string): string {
    return `${roleName} role`;
  }
}

describe('InMemoryIdentitySeed', () => {
  const setup = (values: Record<string, string>) => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const permissions = new InMemoryPermissionRepository();
    const eventBus = new InMemoryEventBus();
    const createRole = new CreateRoleUseCase(roles, eventBus);
    const listRoles = new ListRolesUseCase(roles);
    const listPermissions = new ListPermissionsUseCase(permissions);
    const createUser = new CreateUserUseCase(users, roles, new TestPasswordHasher(), eventBus);
    const assignRolePermissions = new AssignRolePermissionsUseCase(roles, permissions);
    const listUsers = new ListUsersUseCase(users);
    const seed = new InMemoryIdentitySeed(
      new TestConfig(values) as never,
      permissions,
      listPermissions,
      createRole,
      listRoles,
      assignRolePermissions,
      createUser,
      new TestFakeDataGenerator(),
    );

    return { listPermissions, listRoles, listUsers, seed };
  };

  it('creates the shared permissions, base roles, role-permission mappings, fixed admin user and generated demo users', async () => {
    const { listPermissions, listRoles, listUsers, seed } = setup({
      IDENTITY_PERSISTENCE: 'memory',
      IDENTITY_MEMORY_SEED_COUNT: '2',
    });

    await seed.onApplicationBootstrap();

    const permissionResult = await listPermissions.execute();
    const roleResult = await listRoles.execute();
    const userResult = await listUsers.execute();

    expect(permissionResult.ok).toBe(true);
    expect(roleResult.ok).toBe(true);
    expect(userResult.ok).toBe(true);
    if (!permissionResult.ok || !roleResult.ok || !userResult.ok) {
      throw new Error('Expected seed listing to succeed.');
    }

    expect(permissionResult.value.map((permission) => permission.name).sort()).toEqual(
      PERMISSION_CATALOG.map((permission) => permission.name).sort(),
    );
    expect(roleResult.value.map((role) => role.name).sort()).toEqual(ROLE_CATALOG.map((role) => role.name).sort());
    expect(roleResult.value.find((role) => role.name === 'waiter')?.permissionIds).toHaveLength(2);
    expect(userResult.value.map((user) => user.email)).toEqual([
      'admin@mesaflow.demo',
      'manager@mesaflow.demo',
      'waiter@mesaflow.demo',
      'kitchen@mesaflow.demo',
      'developer@mesaflow.demo',
      'admin@example.com',
      'demo1@example.com',
      'demo2@example.com',
    ]);
    expect(userResult.value.filter((user) => user.accountType === 'demo')).toHaveLength(5);
    expect(userResult.value[0]?.roleIds).toHaveLength(1);
  });

  it('still seeds the shared permission and role catalog when demo users are disabled', async () => {
    const { listPermissions, listRoles, listUsers, seed } = setup({
      IDENTITY_PERSISTENCE: 'memory',
      IDENTITY_MEMORY_SEED: 'false',
    });

    await seed.onApplicationBootstrap();

    const permissionResult = await listPermissions.execute();
    const roleResult = await listRoles.execute();
    const userResult = await listUsers.execute();

    expect(permissionResult.ok).toBe(true);
    expect(roleResult.ok).toBe(true);
    expect(userResult.ok).toBe(true);
    if (!permissionResult.ok || !roleResult.ok || !userResult.ok) {
      throw new Error('Expected seed listing to succeed.');
    }
    expect(permissionResult.value).toHaveLength(PERMISSION_CATALOG.length);
    expect(roleResult.value).toHaveLength(ROLE_CATALOG.length);
    expect(userResult.value).toHaveLength(5);
    expect(userResult.value.every((user) => user.accountType === 'demo')).toBe(true);
  });
});
