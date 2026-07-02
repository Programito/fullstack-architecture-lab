import { Injectable } from '@nestjs/common';

type ScopedAuth = { scopes: { organizations: string[]; restaurants: string[] } };

@Injectable()
export class RestaurantScopeService {
  async canAccessRestaurant(auth: ScopedAuth, restaurantId: string): Promise<boolean> {
    return auth.scopes.restaurants.includes(restaurantId);
  }
}
