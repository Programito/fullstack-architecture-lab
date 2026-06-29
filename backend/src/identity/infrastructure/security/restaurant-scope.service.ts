import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type ScopedAuth = { scopes: { organizations: string[]; restaurants: string[] } };

@Injectable()
export class RestaurantScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessRestaurant(auth: ScopedAuth, restaurantId: string): Promise<boolean> {
    if (auth.scopes.restaurants.includes(restaurantId)) {
      return true;
    }

    if (auth.scopes.organizations.length === 0) {
      return false;
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true },
    });

    if (!restaurant) {
      return false;
    }

    return auth.scopes.organizations.includes(restaurant.organizationId);
  }
}
