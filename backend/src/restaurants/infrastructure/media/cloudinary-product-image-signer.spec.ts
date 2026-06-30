import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { CloudinaryProductImageSigner } from './cloudinary-product-image-signer';

describe('CloudinaryProductImageSigner', () => {
  it('returns a signed payload for a restaurant folder', () => {
    const signer = new CloudinaryProductImageSigner(
      new ConfigService({
        CLOUDINARY_CLOUD_NAME: 'demo-cloud',
        CLOUDINARY_API_KEY: 'api-key',
        CLOUDINARY_API_SECRET: 'super-secret',
      }),
    );

    const signed = signer.createSignedUpload({
      restaurantId: 'restaurant-1',
      timestamp: 1_720_000_000,
    });

    expect(signed).toEqual({
      cloudName: 'demo-cloud',
      apiKey: 'api-key',
      timestamp: 1_720_000_000,
      folder: 'restaurants/restaurant-1/products',
      signature: expect.any(String),
    });
    expect(signed.signature).toHaveLength(40);
  });
});
