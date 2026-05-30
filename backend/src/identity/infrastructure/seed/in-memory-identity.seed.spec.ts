import { describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../shared/events/in-memory-event-bus';
import type { FakeDataGenerator } from '../../../shared/fake-data/fake-data-generator.port';
import type { PasswordHasher } from '../../application/ports/password-hasher.port';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
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
  it('creates base roles, fixed admin user and generated demo users', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const eventBus = new InMemoryEventBus();
    const createRole = new CreateRoleUseCase(roles, eventBus);
    const listRoles = new ListRolesUseCase(roles);
    const createUser = new CreateUserUseCase(users, roles, new TestPasswordHasher(), eventBus);
    const listUsers = new ListUsersUseCase(users);
    const seed = new InMemoryIdentitySeed(
      new TestConfig({ IDENTITY_MEMORY_SEED_COUNT: '2' }) as never,
      createRole,
      listRoles,
      createUser,
      new TestFakeDataGenerator(),
    );

    await seed.onApplicationBootstrap();

    const roleResult = await listRoles.execute();
    const userResult = await listUsers.execute();

    expect(roleResult.ok).toBe(true);
    expect(userResult.ok).toBe(true);
    if (!roleResult.ok || !userResult.ok) {
      throw new Error('Expected seed listing to succeed.');
    }

    expect(roleResult.value.map((role) => role.name)).toEqual(['admin', 'manager', 'user']);
    expect(userResult.value.map((user) => user.email)).toEqual(['admin@example.com', 'demo1@example.com', 'demo2@example.com']);
    expect(userResult.value[0]?.roleIds).toHaveLength(1);
  });

  it('does nothing when the seed is disabled', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const eventBus = new InMemoryEventBus();
    const listRoles = new ListRolesUseCase(roles);
    const listUsers = new ListUsersUseCase(users);
    const seed = new InMemoryIdentitySeed(
      new TestConfig({ IDENTITY_MEMORY_SEED: 'false' }) as never,
      new CreateRoleUseCase(roles, eventBus),
      listRoles,
      new CreateUserUseCase(users, roles, new TestPasswordHasher(), eventBus),
      new TestFakeDataGenerator(),
    );

    await seed.onApplicationBootstrap();

    const roleResult = await listRoles.execute();
    const userResult = await listUsers.execute();

    expect(roleResult.ok).toBe(true);
    expect(userResult.ok).toBe(true);
    if (!roleResult.ok || !userResult.ok) {
      throw new Error('Expected seed listing to succeed.');
    }
    expect(roleResult.value).toHaveLength(0);
    expect(userResult.value).toHaveLength(0);
  });
});
