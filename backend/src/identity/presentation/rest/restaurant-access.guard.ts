import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './auth.guard';
import { REQUIRE_RESTAURANT_SCOPE } from './require-restaurant-scope.decorator';

@Injectable()
export class RestaurantAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresScope = this.reflector.getAllAndOverride<boolean>(REQUIRE_RESTAURANT_SCOPE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { params: { id?: string } }>();
    const restaurantId = request.params.id;
    if (!restaurantId) {
      return true;
    }

    if (request.auth.scopes.restaurants.includes(restaurantId)) {
      return true;
    }

    if (request.auth.scopes.organizations.length > 0) {
      return true;
    }

    throw new ForbiddenException('Restaurant access is not allowed for this user.');
  }
}
