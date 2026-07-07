import { Inject, Injectable } from '@nestjs/common';

import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../../../restaurants/application/ports/restaurant-read-repository.port';

type ScopedAuth = { scopes: { organizations: string[]; restaurants: string[] } };

@Injectable()
export class RestaurantScopeService {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY)
    private readonly restaurants: RestaurantReadRepository,
  ) {}

  async canAccessRestaurant(auth: ScopedAuth, restaurantId: string): Promise<boolean> {
    if (auth.scopes.organizations.length === 0 && auth.scopes.restaurants.length === 0) {
      return true;
    }

    if (auth.scopes.restaurants.includes(restaurantId)) {
      return true;
    }

    if (auth.scopes.organizations.length === 0) {
      return false;
    }

    const [restaurant] = await this.restaurants.listRestaurants([restaurantId], []);

    return restaurant !== undefined && auth.scopes.organizations.includes(restaurant.organizationId);
  }
}
