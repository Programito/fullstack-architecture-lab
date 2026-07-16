import { describe, expect, it, vi } from 'vitest';

import { ok } from '../../../shared/result/result';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import type {
  ProductImageSigningPayload,
  ProductImageSigningPort,
} from '../ports/product-image-signing.port';
import { CreateProductImageUploadSignatureUseCase } from './create-product-image-upload-signature.use-case';

function makeRepository(): RestaurantReadRepository {
  return {
    listRestaurants: vi.fn(),
    findMenuByRestaurantId: vi.fn(),
    findFloorsByRestaurantId: vi.fn(),
    listReservationsByRestaurantId: vi.fn(),
    findReservationById: vi.fn(),
    findConflictingReservations: vi.fn(),
    findTableCapacity: vi.fn(),
    createReservation: vi.fn(),
    updateReservationStatus: vi.fn(),
    findServiceFloorByRestaurantId: vi.fn(),
    findServicePointByRestaurantId: vi.fn(),
    findServicePointOrderByRestaurantId: vi.fn(),
    occupyServicePoint: vi.fn(),
    sendServicePointOrderToKitchen: vi.fn(),
    markServicePointOrderServed: vi.fn(),
    chargeServicePoint: vi.fn(),
    setServicePointStatus: vi.fn(),
    reorderFloorElements: vi.fn(),
    updateFloor: vi.fn(),
    updateFloorElement: vi.fn(),
    createFloorElement: vi.fn(),
    updateServiceOrderLineStatus: vi.fn(),
  };
}

describe('CreateProductImageUploadSignatureUseCase', () => {
  it('returns a signed payload when the restaurant exists', async () => {
    const repository = makeRepository();
    const signingPayload: ProductImageSigningPayload = {
      cloudName: 'demo',
      apiKey: 'key',
      timestamp: 123,
      folder: 'restaurants/restaurant-1/products',
      signature: 'abc',
    };
    const signer: ProductImageSigningPort = {
      createSignedUpload: vi.fn().mockReturnValue(signingPayload),
    };
    vi.mocked(repository.listRestaurants).mockResolvedValue([
      { id: 'restaurant-1', name: 'Demo', displayName: 'Demo', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
    ]);

    const useCase = new CreateProductImageUploadSignatureUseCase(repository, signer);

    await expect(
      useCase.execute({
        restaurantId: 'restaurant-1',
        fileName: 'burger.png',
      }),
    ).resolves.toEqual(ok(signingPayload));
    expect(signer.createSignedUpload).toHaveBeenCalledWith({
      restaurantId: 'restaurant-1',
      fileName: 'burger.png',
    });
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repository = makeRepository();
    const signer: ProductImageSigningPort = {
      createSignedUpload: vi.fn(),
    };
    vi.mocked(repository.listRestaurants).mockResolvedValue([]);

    const useCase = new CreateProductImageUploadSignatureUseCase(repository, signer);

    const result = await useCase.execute({
      restaurantId: 'missing',
      fileName: 'burger.png',
    });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'restaurant_not_found' }),
    });
    expect(signer.createSignedUpload).not.toHaveBeenCalled();
  });
});
