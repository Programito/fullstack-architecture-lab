import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../shared/events/in-memory-event-bus';
import { isErr } from '../../../shared/result/result';
import { InMemoryAuthSessionRepository } from '../../infrastructure/persistence/in-memory-auth-session.repository';
import { InMemoryPermissionRepository } from '../../infrastructure/persistence/in-memory-permission.repository';
import { InMemoryRoleRepository } from '../../infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import { Permission } from '../../domain/permission.entity';
import type { PasswordHasher } from '../ports/password-hasher.port';
import { AssignRolePermissionsUseCase } from './assign-role-permissions.use-case';
import { AuthService } from './auth.service';
import { CreateRoleUseCase } from './create-role.use-case';
import { CreateUserUseCase } from './create-user.use-case';
import { SetUserEnabledUseCase } from './set-user-enabled.use-case';

class TestPasswordHasher implements PasswordHasher {
  hash(value: string): Promise<string> {
    return Promise.resolve(`hashed:${value}`);
  }

  compare(value: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${value}`);
  }
}

class TestConfig {
  constructor(private readonly demoLoginEnabled = false) {}

  get<T>(key: string): T | undefined {
    const values: Record<string, string> = {
      JWT_ACCESS_SECRET: 'access-secret-with-more-than-thirty-two-characters',
      JWT_REFRESH_SECRET: 'refresh-secret-with-more-than-thirty-two-characters',
      JWT_ACCESS_TTL_SECONDS: '900',
      JWT_REFRESH_TTL_SECONDS: '604800',
      JWT_REFRESH_ABSOLUTE_TTL_SECONDS: '2592000',
      DEMO_LOGIN_ENABLED: String(this.demoLoginEnabled),
    };
    return values[key] as T | undefined;
  }
}

async function setup() {
  const users = new InMemoryUserRepository();
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const hasher = new TestPasswordHasher();
  const events = new InMemoryEventBus();
  await permissions.save(Permission.create({ name: 'service', description: 'Service access' }));
  await permissions.save(Permission.create({ name: 'layout', description: 'Layout access' }));
  const roleResult = await new CreateRoleUseCase(roles, events).execute({ name: 'admin' });
  if (isErr(roleResult)) throw new Error('Role setup failed.');
  const permissionRecords = await permissions.findAll();
  const assignPermissions = new AssignRolePermissionsUseCase(roles, permissions);
  const assignResult = await assignPermissions.execute({
    roleId: roleResult.value.id,
    permissionIds: permissionRecords.map((permission) => permission.id),
  });
  if (isErr(assignResult)) throw new Error('Permission assignment failed.');
  const userResult = await new CreateUserUseCase(users, roles, hasher, events).execute({
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    password: 'supersecret',
    roleIds: [roleResult.value.id],
  });
  if (isErr(userResult)) throw new Error('User setup failed.');
  const tokens = new AuthTokenService(new JwtService(), new TestConfig() as never);
  return {
    users,
    roles,
    permissions,
    sessions,
    role: assignResult.value,
    user: userResult.value,
    tokens,
    hasher,
    auth: new AuthService(users, roles, permissions, sessions, hasher, tokens, new TestConfig() as never),
  };
}

describe('AuthService', () => {
  it('logs in and rotates the refresh token', async () => {
    const { auth } = await setup();
    const login = await auth.login(' ADMIN@example.com ', 'supersecret');
    const refreshed = await auth.refresh(login.refreshToken);

    expect(login.accessToken).not.toBe(login.refreshToken);
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    expect(refreshed.accessExpiresIn).toBe(900);
    expect(login.permissions).toEqual(['service', 'layout']);
  });

  it('revokes the session when an already rotated refresh token is reused', async () => {
    const { auth, sessions } = await setup();
    const login = await auth.login('admin@example.com', 'supersecret');
    const refreshed = await auth.refresh(login.refreshToken);

    await expect(auth.refresh(login.refreshToken)).rejects.toThrow('reuse detected');
    await expect(auth.refresh(refreshed.refreshToken)).rejects.toThrow('Session is not valid');

    const session = (await sessions.findByUserId(login.user.id))[0];
    expect(session?.enabled).toBe(false);
    expect(session?.revokedAt).toBeInstanceOf(Date);
  });

  it('creates users, roles and sessions enabled by default', async () => {
    const { auth, sessions, user, role } = await setup();
    await auth.login('admin@example.com', 'supersecret');
    const session = (await sessions.findByUserId(user.id))[0];
    expect(user.enabled).toBe(true);
    expect(role.enabled).toBe(true);
    expect(session?.enabled).toBe(true);
  });

  it('does not include disabled roles or permissions in newly issued access tokens', async () => {
    const { auth, roles, permissions, role, tokens } = await setup();
    const [servicePermission] = await permissions.findAll();
    if (!servicePermission) {
      throw new Error('Expected permissions to be seeded.');
    }
    servicePermission.setEnabled(false);
    await permissions.save(servicePermission);
    role.setEnabled(false);
    await roles.save(role);
    const login = await auth.login('admin@example.com', 'supersecret');
    const payload = await tokens.verifyAccessToken(login.accessToken);
    expect(payload.roles).toEqual([]);
    expect(payload.permissions).toEqual([]);
  });

  it('disabling a user invalidates sessions and re-enabling does not revive them', async () => {
    const { auth, users, sessions, user } = await setup();
    const login = await auth.login('admin@example.com', 'supersecret');
    const setEnabled = new SetUserEnabledUseCase(users, sessions);

    await setEnabled.execute(user.id, false);
    await expect(auth.refresh(login.refreshToken)).rejects.toThrow('Session is not valid');
    await setEnabled.execute(user.id, true);
    await expect(auth.refresh(login.refreshToken)).rejects.toThrow('Session is not valid');
  });

  it('blocks system and test accounts from interactive authentication', async () => {
    const { auth, users, user } = await setup();
    for (const accountType of ['system', 'test'] as const) {
      user.setAccountType(accountType);
      await users.save(user);
      await expect(auth.login(user.email, 'supersecret')).rejects.toThrow('Invalid email or password');
    }
  });

  it('blocks demo login and refresh as soon as demo access is disabled', async () => {
    const { users, roles, permissions, sessions, hasher, tokens, user } = await setup();
    user.setAccountType('demo');
    await users.save(user);
    const enabledAuth = new AuthService(
      users,
      roles,
      permissions,
      sessions,
      hasher,
      tokens,
      new TestConfig(true) as never,
    );
    const login = await enabledAuth.login(user.email, 'supersecret');
    const disabledAuth = new AuthService(
      users,
      roles,
      permissions,
      sessions,
      hasher,
      tokens,
      new TestConfig(false) as never,
    );

    await expect(disabledAuth.login(user.email, 'supersecret')).rejects.toThrow('Invalid email or password');
    await expect(disabledAuth.refresh(login.refreshToken)).rejects.toThrow('Session is not valid');
    expect((await sessions.findByUserId(user.id))[0]?.enabled).toBe(false);
  });
});
