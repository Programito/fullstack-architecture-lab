import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthSession } from '../../domain/auth-session.entity';
import type { User } from '../../domain/user.entity';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import { AUTH_SESSION_REPOSITORY, type AuthSessionRepository } from '../ports/auth-session-repository.port';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';
import { PERMISSION_REPOSITORY, type PermissionRepository } from '../ports/permission-repository.port';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  user: User;
  permissions: string[];
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly tokens: AuthTokenService,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.enabled || !(await this.passwordHasher.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const now = Date.now();
    const session = AuthSession.create({
      userId: user.id,
      refreshTokenHash: 'pending',
      expiresAt: new Date(now + this.tokens.refreshTtlSeconds * 1000),
      absoluteExpiresAt: new Date(now + this.tokens.absoluteRefreshTtlSeconds * 1000),
    });
    const refreshToken = await this.tokens.issueRefreshToken(user.id, session.id);
    session.rotate(this.tokens.hashRefreshToken(refreshToken), session.expiresAt);
    await this.sessions.save(session);
    return this.createResult(user, session.id, refreshToken);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = await this.tokens.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findById(payload.sid);
    if (!session) throw new UnauthorizedException('Session is not valid.');
    if (session.refreshTokenHash !== this.tokens.hashRefreshToken(refreshToken)) {
      session.setEnabled(false);
      await this.sessions.save(session);
      throw new UnauthorizedException('Refresh token reuse detected. Session revoked.');
    }
    const user = await this.users.findById(payload.sub);
    if (!user?.enabled || session.userId !== user.id || !session.isUsable()) {
      if (session.enabled) {
        session.setEnabled(false);
        await this.sessions.save(session);
      }
      throw new UnauthorizedException('Session is not valid.');
    }
    const nextExpiry = Math.min(Date.now() + this.tokens.refreshTtlSeconds * 1000, session.absoluteExpiresAt.getTime());
    const nextRefreshToken = await this.tokens.issueRefreshToken(user.id, session.id);
    session.rotate(this.tokens.hashRefreshToken(nextRefreshToken), new Date(nextExpiry));
    await this.sessions.save(session);
    return this.createResult(user, session.id, nextRefreshToken);
  }

  async logout(sessionId: string): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    if (session) {
      session.setEnabled(false);
      await this.sessions.save(session);
    }
  }

  private async createResult(user: User, sessionId: string, refreshToken: string): Promise<AuthResult> {
    const activeRoles = (await this.roles.findManyByIds(user.roleIds)).filter((role) => role.enabled);
    const permissions = (
      await this.permissions.findManyByIds(activeRoles.flatMap((role) => role.permissionIds))
    )
      .filter((permission) => permission.enabled)
      .map((permission) => permission.name);

    return {
      accessToken: await this.tokens.issueAccessToken(
        user.id,
        sessionId,
        activeRoles.map((role) => role.name),
        permissions,
      ),
      refreshToken,
      accessExpiresIn: this.tokens.accessTtlSeconds,
      user,
      permissions,
    };
  }
}
