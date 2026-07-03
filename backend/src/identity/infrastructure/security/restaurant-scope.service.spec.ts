import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantScopeService } from './restaurant-scope.service';
import type { PrismaService } from '../../../shared/prisma/prisma.service';

describe('RestaurantScopeService', () => {
  let service: RestaurantScopeService;
  let findUnique: ReturnType<typeof vi.fn>;
  let prisma: PrismaService;

  beforeEach(() => {
    findUnique = vi.fn();
    prisma = { restaurant: { findUnique } } as unknown as PrismaService;
    service = new RestaurantScopeService(prisma);
  });

  it('grants access when the user has a direct restaurant scope for the requested restaurant', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-1'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('denies access when the user has a direct scope for a different restaurant and no organization scope', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-2'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });

  it('grants access when the restaurant belongs to an organization in scope', async () => {
    findUnique.mockResolvedValue({ organizationId: 'org-1' });
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'rest-1' }, select: { organizationId: true } });
  });

  it('denies access when the restaurant belongs to a different organization', async () => {
    findUnique.mockResolvedValue({ organizationId: 'org-2' });
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });

  it('denies access when the restaurant does not exist', async () => {
    findUnique.mockResolvedValue(null);
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'nonexistent')).resolves.toBe(false);
  });

  it('denies access when the user has no scopes', async () => {
    const auth = { scopes: { organizations: [], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
