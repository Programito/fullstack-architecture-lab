import { Inject, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { canUseInteractiveAuth } from '../../domain/account-type';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import { AUTH_SESSION_REPOSITORY, type AuthSessionRepository } from '../ports/auth-session-repository.port';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';

@Injectable()
export class DeveloperAccessService {
  constructor(
    private readonly tokens: AuthTokenService,
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository,
  ) {}

  async assertAccess(accessToken: string | null): Promise<void> {
    if (!accessToken) throw new UnauthorizedException('Developer access cookie is required.');
    const payload = await this.tokens.verifyAccessToken(accessToken);
    const [user, session] = await Promise.all([
      this.users.findById(payload.sub),
      this.sessions.findById(payload.sid),
    ]);
    const demoEnabled = this.config.get<string>('DEMO_LOGIN_ENABLED') === 'true';
    if (
      !user?.enabled ||
      !canUseInteractiveAuth(user.accountType, demoEnabled) ||
      !session?.enabled ||
      session.userId !== user.id ||
      session.revokedAt
    ) {
      throw new UnauthorizedException('Developer session is not valid.');
    }
    const activeRoles = (await this.roles.findManyByIds(user.roleIds)).filter((role) => role.enabled);
    if (!activeRoles.some((role) => role.name === 'developer')) {
      throw new ForbiddenException('Developer role is required.');
    }
  }
}
