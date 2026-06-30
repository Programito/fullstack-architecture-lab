import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RestaurantPosApiService } from '../../restaurant-pos/api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../restaurant-pos/state/restaurant-context.store';
import { ProductImageUploadError, ProductImageUploadService } from './product-image-upload.service';

describe('ProductImageUploadService', () => {
  const getProductImageUploadSignature = vi.fn();

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProductImageUploadService,
        {
          provide: RestaurantPosApiService,
          useValue: { getProductImageUploadSignature },
        },
        {
          provide: RestaurantContextStore,
          useValue: {
            activeRestaurant: () => ({ id: 'restaurant-1' }),
          },
        },
      ],
    });

    return {
      service: TestBed.inject(ProductImageUploadService),
      http: TestBed.inject(HttpTestingController),
    };
  };

  beforeEach(() => {
    getProductImageUploadSignature.mockReset();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('requests a signature and uploads the file to Cloudinary', async () => {
    mockReadableImageDimensions(1200, 800);
    getProductImageUploadSignature.mockReturnValueOnce(
      of({
        cloudName: 'demo-cloud',
        apiKey: 'key-123',
        timestamp: 1711111111,
        signature: 'signed-payload',
        folder: 'restaurants/restaurant-1/products',
      }),
    );

    const { service, http } = setup();
    const file = new File(['image'], 'burger.jpg', { type: 'image/jpeg' });
    let uploadedUrl: string | undefined;

    service.uploadProductImage(file).subscribe((value) => {
      uploadedUrl = value;
    });

    await flushImagePreparation();
    expect(getProductImageUploadSignature).toHaveBeenCalledWith('restaurant-1', { fileName: 'burger.jpg' });

    const request = http.expectOne('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('api_key')).toBe('key-123');
    expect(body.get('timestamp')).toBe('1711111111');
    expect(body.get('signature')).toBe('signed-payload');
    expect(body.get('folder')).toBe('restaurants/restaurant-1/products');
    request.flush({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg' });

    expect(uploadedUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/burger.jpg');
    http.verify();
  });

  it('throws when Cloudinary does not return secure_url', async () => {
    mockReadableImageDimensions(1200, 800);
    getProductImageUploadSignature.mockReturnValueOnce(
      of({
        cloudName: 'demo-cloud',
        apiKey: 'key-123',
        timestamp: 1711111111,
        signature: 'signed-payload',
        folder: 'restaurants/restaurant-1/products',
      }),
    );

    const { service, http } = setup();
    const file = new File(['image'], 'burger.jpg', { type: 'image/jpeg' });
    let thrownError: ProductImageUploadError | undefined;

    service.uploadProductImage(file).subscribe({
      error: (error: ProductImageUploadError) => {
        thrownError = error;
      },
    });

    await flushImagePreparation();
    const requests = http.match('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    expect(requests).toHaveLength(1);
    requests[0].flush({});

    expect(thrownError?.code).toBe('invalid-response');
    http.verify();
  });

  it('retries the Cloudinary request once after a failed upload response', async () => {
    mockReadableImageDimensions(1200, 800);
    getProductImageUploadSignature.mockReturnValue(
      of({
        cloudName: 'demo-cloud',
        apiKey: 'key-123',
        timestamp: 1711111111,
        signature: 'signed-payload',
        folder: 'restaurants/restaurant-1/products',
      }),
    );

    const { service, http } = setup();
    const file = new File(['image'], 'burger.jpg', { type: 'image/jpeg' });
    let uploadedUrl: string | undefined;
    let thrownError: ProductImageUploadError | undefined;

    service.uploadProductImage(file).subscribe({
      next: (value) => {
        uploadedUrl = value;
      },
      error: (error: ProductImageUploadError) => {
        thrownError = error;
      },
    });

    await flushImagePreparation();
    const requests = http.match('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    expect(requests).toHaveLength(1);
    requests[0].flush('temporary failure', { status: 500, statusText: 'Server Error' });

    await flushImagePreparation();
    const retryRequest = http.expectOne('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    retryRequest.flush({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/retry.jpg' });

    expect(getProductImageUploadSignature).toHaveBeenCalledTimes(2);
    expect(thrownError).toBeUndefined();
    expect(uploadedUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/retry.jpg');
    http.verify();
  });

  it('maps image validation errors to a typed upload error', async () => {
    const { service, http } = setup();
    const file = new File([new Uint8Array(9 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    let thrownError: ProductImageUploadError | undefined;

    service.uploadProductImage(file).subscribe({
      error: (error: ProductImageUploadError) => {
        thrownError = error;
      },
    });

    await flushImagePreparation();
    expect(thrownError?.code).toBe('file-too-large');
    expect(getProductImageUploadSignature).not.toHaveBeenCalled();
    http.verify();
  });
});

function mockReadableImageDimensions(width: number, height: number): void {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-image');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  class FakeImage {
    naturalWidth = width;
    naturalHeight = height;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }

  vi.stubGlobal('Image', FakeImage);
}

async function flushImagePreparation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
