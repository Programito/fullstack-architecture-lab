import { ApiProperty } from '@nestjs/swagger';

import type { ProductImageSigningPayload } from '../../../application/ports/product-image-signing.port';

export class ProductImageUploadSignatureResponseDto {
  @ApiProperty() cloudName!: string;
  @ApiProperty() apiKey!: string;
  @ApiProperty() timestamp!: number;
  @ApiProperty() folder!: string;
  @ApiProperty() signature!: string;

  static from(payload: ProductImageSigningPayload): ProductImageUploadSignatureResponseDto {
    return {
      cloudName: payload.cloudName,
      apiKey: payload.apiKey,
      timestamp: payload.timestamp,
      folder: payload.folder,
      signature: payload.signature,
    };
  }
}
