import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './auth.guard';
import { REQUIRE_RESTAURANT_SCOPE } from './require-restaurant-scope.decorator';
import { RestaurantScopeService } from '../../infrastructure/security/restaurant-scope.service';

@Injectable()
export class RestaurantAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly restaurantScope: RestaurantScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const allowed = await this.restaurantScope.canAccessRestaurant(request.auth, restaurantId);
    if (!allowed) {
      throw new ForbiddenException('Restaurant access is not allowed for this user.');
    }
    return true;
  }
}
