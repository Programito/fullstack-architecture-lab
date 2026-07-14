import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../../../restaurants/application/ports/restaurant-read-repository.port';
import type { AuthenticatedRequest } from './auth.guard';

const REQUIRED_PERMISSIONS = 'required_permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RESTAURANT_READ_REPOSITORY)
    private readonly restaurants: RestaurantReadRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];
    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { params?: Record<string, string> }>();
    const restaurantId = request.params?.id;

    if (!restaurantId) {
      if (!required.every((p) => request.auth.permissions.includes(p))) {
        throw new ForbiddenException('Insufficient permissions.');
      }
      return true;
    }

    const restaurantPerms = request.auth.restaurantPermissions[restaurantId] ?? [];
    if (required.every((p) => restaurantPerms.includes(p))) return true;

    const orgPerms = await this.resolveOrgPermissions(request.auth, restaurantId);
    if (required.every((p) => orgPerms.includes(p))) return true;

    throw new ForbiddenException('Insufficient permissions.');
  }

  private async resolveOrgPermissions(
    auth: AuthenticatedRequest['auth'],
    restaurantId: string,
  ): Promise<string[]> {
    if (auth.scopes.organizations.length === 0) return [];
    const allOrgPerms = Object.values(auth.organizationPermissions).flat();
    if (allOrgPerms.length === 0) return [];
    const [restaurant] = await this.restaurants.listRestaurants([restaurantId], []);
    if (!restaurant) return [];
    return auth.organizationPermissions[restaurant.organizationId] ?? [];
  }
}
