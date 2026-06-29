import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestaurantScopeService } from './restaurant-scope.service';

const makePrisma = (organizationId: string | null) => ({
  restaurant: {
    findUnique: vi.fn().mockResolvedValue(organizationId !== undefined ? { organizationId } : null),
  },
});

describe('RestaurantScopeService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: RestaurantScopeService;

  beforeEach(() => {
    prisma = makePrisma('org-1');
    service = new RestaurantScopeService(prisma as never);
  });

  it('grants access when the user has a direct restaurant scope for the requested restaurant', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-1'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
    expect(prisma.restaurant.findUnique).not.toHaveBeenCalled();
  });

  it('denies access when the user has a direct scope for a different restaurant', async () => {
    const auth = { scopes: { organizations: [], restaurants: ['rest-2'] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
    expect(prisma.restaurant.findUnique).not.toHaveBeenCalled();
  });

  it('grants access when the user has an org scope and the restaurant belongs to that org', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ organizationId: 'org-1' });
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(true);
    expect(prisma.restaurant.findUnique).toHaveBeenCalledWith({
      where: { id: 'rest-1' },
      select: { organizationId: true },
    });
  });

  it('denies access when the user has an org scope but the restaurant belongs to a different org', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ organizationId: 'org-other' });
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
  });

  it('denies access when the restaurant does not exist', async () => {
    prisma.restaurant.findUnique.mockResolvedValue(null);
    const auth = { scopes: { organizations: ['org-1'], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'nonexistent')).resolves.toBe(false);
  });

  it('denies access when the user has no scopes', async () => {
    const auth = { scopes: { organizations: [], restaurants: [] } };
    await expect(service.canAccessRestaurant(auth, 'rest-1')).resolves.toBe(false);
    expect(prisma.restaurant.findUnique).not.toHaveBeenCalled();
  });
});
