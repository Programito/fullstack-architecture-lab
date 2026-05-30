import { describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../shared/events/in-memory-event-bus';
import { isErr, isOk } from '../../../shared/result/result';
import type { PasswordHasher } from '../ports/password-hasher.port';
import { InMemoryRoleRepository } from '../../infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository';
import { AssignUserRolesUseCase } from './assign-user-roles.use-case';
import { CreateRoleUseCase } from './create-role.use-case';
import { CreateUserUseCase } from './create-user.use-case';

class TestPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

describe('identity use cases', () => {
  it('creates a user with normalized email, trimmed name and hashed password', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const eventBus = new InMemoryEventBus();
    const createUser = new CreateUserUseCase(users, roles, new TestPasswordHasher(), eventBus);

    const result = await createUser.execute({
      email: ' ADMIN@Example.COM ',
      name: ' Admin User ',
      password: 'supersecret',
    });

    expect(isOk(result)).toBe(true);
    if (isErr(result)) {
      throw new Error('Expected user creation to succeed.');
    }
    expect(result.value.email).toBe('admin@example.com');
    expect(result.value.name).toBe('Admin User');
    expect(result.value.passwordHash).toBe('hashed:supersecret');
    expect(result.value.passwordHash).not.toBe('supersecret');
    expect(eventBus.getPublishedEvents().map((event) => event.type)).toEqual(['user.created']);
  });

  it('rejects duplicated normalized emails', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const createUser = new CreateUserUseCase(users, roles, new TestPasswordHasher(), new InMemoryEventBus());

    await createUser.execute({
      email: 'admin@example.com',
      name: 'Admin',
      password: 'supersecret',
    });
    const result = await createUser.execute({
      email: ' ADMIN@example.com ',
      name: 'Other Admin',
      password: 'supersecret',
    });

    expect(isErr(result)).toBe(true);
    if (isOk(result)) {
      throw new Error('Expected duplicated email to fail.');
    }
    expect(result.error.code).toBe('email_already_taken');
  });

  it('rejects short passwords', async () => {
    const createUser = new CreateUserUseCase(
      new InMemoryUserRepository(),
      new InMemoryRoleRepository(),
      new TestPasswordHasher(),
      new InMemoryEventBus(),
    );

    const result = await createUser.execute({
      email: 'admin@example.com',
      name: 'Admin',
      password: 'short',
    });

    expect(isErr(result)).toBe(true);
    if (isOk(result)) {
      throw new Error('Expected short password to fail.');
    }
    expect(result.error.code).toBe('invalid_password');
  });

  it('creates roles and assigns them to a user', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const eventBus = new InMemoryEventBus();
    const createRole = new CreateRoleUseCase(roles, eventBus);
    const createUser = new CreateUserUseCase(users, roles, new TestPasswordHasher(), eventBus);
    const assignRoles = new AssignUserRolesUseCase(users, roles, eventBus);

    const roleResult = await createRole.execute({ name: ' Admin ' });
    const userResult = await createUser.execute({
      email: 'admin@example.com',
      name: 'Admin',
      password: 'supersecret',
    });

    expect(isOk(roleResult)).toBe(true);
    expect(isOk(userResult)).toBe(true);
    if (isErr(roleResult) || isErr(userResult)) {
      throw new Error('Expected setup to succeed.');
    }

    const assignResult = await assignRoles.execute({
      userId: userResult.value.id,
      roleIds: [roleResult.value.id],
    });

    expect(isOk(assignResult)).toBe(true);
    if (isErr(assignResult)) {
      throw new Error('Expected role assignment to succeed.');
    }
    expect(assignResult.value.roleIds).toEqual([roleResult.value.id]);
  });
});
