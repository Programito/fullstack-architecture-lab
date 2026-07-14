import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ImageUploadScope, ProductImageSigningPayload, ProductImageSigningPort } from '../../application/ports/product-image-signing.port';

@Injectable()
export class CloudinaryProductImageSigner implements ProductImageSigningPort {
  constructor(private readonly config: ConfigService) {}

  createSignedUpload(input: {
    restaurantId: string;
    fileName?: string;
    timestamp?: number;
    scope?: ImageUploadScope;
  }): ProductImageSigningPayload {
    const cloudName = requiredConfig(this.config, 'CLOUDINARY_CLOUD_NAME');
    const apiKey = requiredConfig(this.config, 'CLOUDINARY_API_KEY');
    const apiSecret = requiredConfig(this.config, 'CLOUDINARY_API_SECRET');
    const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
    const folder = `restaurants/${input.restaurantId}/${input.scope ?? 'products'}`;
    const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signatureBase).digest('hex');

    return {
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    };
  }
}

function requiredConfig(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (!value) {
    throw new Error(`Missing required config value "${key}".`);
  }
  return value;
}
