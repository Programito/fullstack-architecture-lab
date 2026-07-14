import { describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../shared/events/in-memory-event-bus';
import { isErr, isOk } from '../../../shared/result/result';
import type { PasswordHasher } from '../ports/password-hasher.port';
import { Permission } from '../../domain/permission.entity';
import { InMemoryPermissionRepository } from '../../infrastructure/persistence/in-memory-permission.repository';
import { InMemoryRoleRepository } from '../../infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository';
import { AssignRolePermissionsUseCase } from './assign-role-permissions.use-case';
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
      firstName: ' Admin ',
      lastName: ' User ',
      password: 'supersecret',
    });

    expect(isOk(result)).toBe(true);
    if (isErr(result)) {
      throw new Error('Expected user creation to succeed.');
    }
    expect(result.value.email).toBe('admin@example.com');
    expect(result.value.firstName).toBe('Admin');
    expect(result.value.lastName).toBe('User');
    expect(result.value.enabled).toBe(true);
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
      firstName: 'Admin',
      lastName: 'User',
      password: 'supersecret',
    });
    const result = await createUser.execute({
      email: ' ADMIN@example.com ',
      firstName: 'Other',
      lastName: 'Admin',
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
      firstName: 'Admin',
      lastName: 'User',
      password: 'short',
    });

    expect(isErr(result)).toBe(true);
    if (isOk(result)) {
      throw new Error('Expected short password to fail.');
    }
    expect(result.error.code).toBe('invalid_password');
  });

  it('creates roles, assigns permissions and assigns roles to a user', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const permissions = new InMemoryPermissionRepository();
    const eventBus = new InMemoryEventBus();
    const createRole = new CreateRoleUseCase(roles, eventBus);
    const createUser = new CreateUserUseCase(users, roles, new TestPasswordHasher(), eventBus);
    const assignRoles = new AssignUserRolesUseCase(users, roles, eventBus);
    const assignPermissions = new AssignRolePermissionsUseCase(roles, permissions);

    await permissions.save(Permission.create({ name: 'service', description: 'Service access' }));
    const permission = (await permissions.findAll())[0];
    if (!permission) {
      throw new Error('Expected permission setup to succeed.');
    }

    const roleResult = await createRole.execute({ name: ' Admin ' });
    const userResult = await createUser.execute({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'supersecret',
    });

    expect(isOk(roleResult)).toBe(true);
    expect(isOk(userResult)).toBe(true);
    if (isErr(roleResult) || isErr(userResult)) {
      throw new Error('Expected setup to succeed.');
    }

    const assignPermissionResult = await assignPermissions.execute({
      roleId: roleResult.value.id,
      permissionIds: [permission.id],
    });
    const assignRoleResult = await assignRoles.execute({
      userId: userResult.value.id,
      roleIds: [roleResult.value.id],
    });

    expect(isOk(assignPermissionResult)).toBe(true);
    expect(isOk(assignRoleResult)).toBe(true);
    if (isErr(assignPermissionResult) || isErr(assignRoleResult)) {
      throw new Error('Expected assignments to succeed.');
    }
    expect(assignPermissionResult.value.permissionIds).toEqual([permission.id]);
    expect(assignRoleResult.value.roleIds).toEqual([roleResult.value.id]);
  });
});
