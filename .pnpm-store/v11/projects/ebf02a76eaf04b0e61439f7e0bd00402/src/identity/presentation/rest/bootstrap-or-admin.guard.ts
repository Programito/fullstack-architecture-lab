import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { USER_REPOSITORY, type UserRepository } from '../../application/ports/user-repository.port';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';

@Injectable()
export class BootstrapOrAdminGuard implements CanActivate {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly authGuard: AuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const existingUsers = await this.users.findAll();
    if (existingUsers.length === 0) return true;

    await this.authGuard.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth.roles.includes('admin')) {
      throw new ForbiddenException('Insufficient permissions.');
    }
    return true;
  }
}
