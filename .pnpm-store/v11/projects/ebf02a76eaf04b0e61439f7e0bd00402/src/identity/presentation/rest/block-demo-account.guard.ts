import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.guard';

@Injectable()
export class BlockDemoAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.auth?.accountType === 'demo') {
      throw new ForbiddenException('Demo accounts cannot perform this action.');
    }
    return true;
  }
}
