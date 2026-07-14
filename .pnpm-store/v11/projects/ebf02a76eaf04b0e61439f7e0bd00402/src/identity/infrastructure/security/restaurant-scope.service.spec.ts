import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantScopeService } from './restaurant-scope.service';
import type { RestaurantReadRepository } from '../../../restaurants/application/ports/restaurant-read-repository.port';

describe('RestaurantScopeService', () => {
  let service: RestaurantScopeService;
  let listRestaurants: ReturnType<typeof vi.fn>;
  let restaurants: RestaurantReadRepository;

  beforeEach(() => {
    listRestaurants = vi.fn();
    restaurants = { listRestaurants } as unknown as RestaurantReadRepository;
    service = new RestaurantScopeService(restaurants);
  });

  it('grants access when the user has a direct restaurant scope for the requested restaurant', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-1'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
    expect(listRestaurants).not.toHaveBeenCalled();
  });

  it('denies access when the user has a direct scope for a different restaurant and no organization scope', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-2'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });

  it('grants access when the restaurant belongs to an organization in scope', async () => {
    listRestaurants.mockResolvedValue([{ id: 'rest-1', organizationId: 'org-1' }]);
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
    expect(listRestaurants).toHaveBeenCalledWith(['rest-1'], []);
  });

  it('denies access when the restaurant belongs to a different organization', async () => {
    listRestaurants.mockResolvedValue([{ id: 'rest-1', organizationId: 'org-2' }]);
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });

  it('denies access when the restaurant does not exist', async () => {
    listRestaurants.mockResolvedValue([]);
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'nonexistent')).resolves.toBe(false);
  });

  it('grants access when the user has no scopes configured', async () => {
    const auth = { scopes: { organizations: [], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
    expect(listRestaurants).not.toHaveBeenCalled();
  });
});
