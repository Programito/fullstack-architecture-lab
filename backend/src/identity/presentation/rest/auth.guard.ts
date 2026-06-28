import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_SESSION_REPOSITORY, type AuthSessionRepository } from '../../application/ports/auth-session-repository.port';
import { PERMISSION_REPOSITORY, type PermissionRepository } from '../../application/ports/permission-repository.port';
import { ROLE_REPOSITORY, type RoleRepository } from '../../application/ports/role-repository.port';
import {
  USER_ROLE_ASSIGNMENT_REPOSITORY,
  type UserRoleAssignmentRepository,
} from '../../application/ports/user-role-assignment-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../../application/ports/user-repository.port';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import { ConfigService } from '@nestjs/config';
import { canUseInteractiveAuth } from '../../domain/account-type';

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  auth: {
    userId: string;
    sessionId: string;
    roles: string[];
    permissions: string[];
    scopes: { organizations: string[]; restaurants: string[] };
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: AuthTokenService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository,
    @Inject(USER_ROLE_ASSIGNMENT_REPOSITORY) private readonly userRoleAssignments: UserRoleAssignmentRepository,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token is required.');
    const payload = await this.tokens.verifyAccessToken(authorization.slice(7));
    const [user, session] = await Promise.all([this.users.findById(payload.sub), this.sessions.findById(payload.sid)]);
    const demoEnabled = this.config.get<string>('DEMO_LOGIN_ENABLED') === 'true';
    if (
      !user?.enabled ||
      !canUseInteractiveAuth(user.accountType, demoEnabled) ||
      !session?.enabled ||
      session.userId !== user.id ||
      session.revokedAt
    ) {
      if (session?.enabled) await this.sessions.disableAllForUser(payload.sub);
      throw new UnauthorizedException('User or session is disabled.');
    }
    const activeRoles = (await this.roles.findManyByIds(user.roleIds)).filter((role) => role.enabled);
    const activePermissions = (
      await this.permissions.findManyByIds(activeRoles.flatMap((role) => role.permissionIds))
    )
      .filter((permission) => permission.enabled)
      .map((permission) => permission.name);
    const assignments = await this.userRoleAssignments.findByUserId(user.id);
    request.auth = {
      userId: user.id,
      sessionId: session.id,
      roles: activeRoles.map((role) => role.name),
      permissions: activePermissions,
      scopes: {
        organizations: [...new Set(assignments.flatMap((assignment) => assignment.organizationId ? [assignment.organizationId] : []))],
        restaurants: [...new Set(assignments.flatMap((assignment) => assignment.restaurantId ? [assignment.restaurantId] : []))],
      },
    };
    return true;
  }
}
