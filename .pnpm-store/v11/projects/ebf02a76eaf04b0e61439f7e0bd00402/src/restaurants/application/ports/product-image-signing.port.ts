export const PRODUCT_IMAGE_SIGNING_PORT = Symbol('PRODUCT_IMAGE_SIGNING_PORT');

export type ImageUploadScope = 'products' | 'modifier-options';

export type ProductImageSigningPayload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export interface ProductImageSigningPort {
  createSignedUpload(input: {
    restaurantId: string;
    fileName?: string;
    timestamp?: number;
    scope?: ImageUploadScope;
  }): ProductImageSigningPayload;
}
