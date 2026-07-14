import { AuditService } from './audit.service';
import { ObservabilityService } from './observability.service';

describe('AuditService', () => {
  it('merges actor roles into audit metadata', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const service = new AuditService({ record } as unknown as ObservabilityService);

    await service.record({
      event: 'menu.product.created',
      message: 'Product created.',
      actorRoles: ['manager'],
      organizationId: 'org-demo',
      userId: 'user-1',
      metadata: { productId: 'product-1' },
    });

    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-demo',
      metadata: {
        actorRoles: ['manager'],
        result: 'succeeded',
        entityType: null,
        entityId: null,
        entityLabel: null,
        changedFields: [],
        productId: 'product-1',
      },
    }));
  });

  it('records structured audit metadata with actor, entity, result, and changed fields', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const service = new AuditService({ record } as unknown as ObservabilityService);

    await service.record({
      event: 'restaurant.product.updated',
      message: 'Product updated.',
      organizationId: 'org-1',
      userId: 'user-1',
      actorRoles: ['manager'],
      result: 'succeeded',
      entityType: 'product',
      entityId: 'prod-1',
      entityLabel: 'Burger',
      changedFields: ['price', 'isAvailable'],
    });

    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        actorRoles: ['manager'],
        result: 'succeeded',
        entityType: 'product',
        entityId: 'prod-1',
        entityLabel: 'Burger',
        changedFields: ['price', 'isAvailable'],
      }),
    }));
  });

  it('preserves client origin inside audit metadata', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const service = new AuditService({ record } as unknown as ObservabilityService);

    await service.record({
      event: 'auth.login.succeeded',
      message: 'User signed in.',
      metadata: { clientOrigin: 'web-admin' },
    });

    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        clientOrigin: 'web-admin',
      }),
    }));
  });
});
