import { beforeEach, describe, expect, it } from 'vitest';
import { RestaurantScopeService } from './restaurant-scope.service';

describe('RestaurantScopeService', () => {
  let service: RestaurantScopeService;

  beforeEach(() => {
    service = new RestaurantScopeService();
  });

  it('grants access when the user has a direct restaurant scope for the requested restaurant', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-1'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
  });

  it('denies access when the user has a direct scope for a different restaurant', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-2'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });

  it('denies access when the token only has organization scope', async () => {
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });

  it('denies access when the restaurant does not exist in the token scope', async () => {
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'nonexistent')).resolves.toBe(false);
  });

  it('denies access when the user has no scopes', async () => {
    const auth = { scopes: { organizations: [], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });
});
