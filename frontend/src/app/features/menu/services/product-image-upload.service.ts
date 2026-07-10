import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, from, map, retry, switchMap, throwError, type Observable } from 'rxjs';

import { RestaurantPosApiService } from '../../restaurant-pos/api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../restaurant-pos/state/restaurant-context.store';
import type { ImageValidationErrorReason } from '../utils/image-upload.utils';
import { prepareImageFile } from '../utils/image-upload.utils';

type CloudinaryUploadResponse = {
  secure_url?: string;
};

export type ProductImageUploadErrorCode =
  | ImageValidationErrorReason
  | 'upload-failed'
  | 'invalid-response';

export class ProductImageUploadError extends Error {
  constructor(
    readonly code: ProductImageUploadErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductImageUploadService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(RestaurantPosApiService);
  private readonly context = inject(RestaurantContextStore);

  uploadProductImage(file: File, scope: 'products' | 'modifier-options' = 'products'): Observable<string> {
    return defer(() => {
      const restaurantId = this.context.activeRestaurant()?.id;
      if (!restaurantId) {
        return throwError(() => new ProductImageUploadError('upload-failed', 'No active restaurant'));
      }

      return this.uploadToRestaurant(file, scope, restaurantId);
    });
  }

  private uploadToRestaurant(file: File, scope: 'products' | 'modifier-options', restaurantId: string): Observable<string> {
    return defer(() => from(prepareImageFile(file))).pipe(
      catchError((error) => throwError(() => this.mapError(error))),
      switchMap((signature) => {
        return this.api.getProductImageUploadSignature(restaurantId, { fileName: signature.name, scope }).pipe(
          map((payload) => ({ payload, preparedFile: signature })),
        );
      }),
      switchMap(({ payload, preparedFile }) => {
        const formData = new FormData();
        formData.set('file', preparedFile);
        formData.set('api_key', payload.apiKey);
        formData.set('timestamp', String(payload.timestamp));
        formData.set('signature', payload.signature);
        formData.set('folder', payload.folder);

        return this.http.post<CloudinaryUploadResponse>(
          `https://api.cloudinary.com/v1_1/${payload.cloudName}/image/upload`,
          formData,
        );
      }),
      retry({ count: 1 }),
      map((response) => {
        if (!response.secure_url) {
          throw new ProductImageUploadError('invalid-response', 'Cloudinary upload did not return secure_url');
        }

        return response.secure_url;
      }),
      catchError((error) => throwError(() => this.mapError(error))),
    );
  }

  private mapError(error: unknown): ProductImageUploadError {
    if (error instanceof ProductImageUploadError) {
      return error;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'reason' in error &&
      (error.reason === 'invalid-type' || error.reason === 'file-too-large' || error.reason === 'image-too-small')
    ) {
      return new ProductImageUploadError(error.reason, `Image validation failed: ${error.reason}`, {
        ...(typeof error === 'object' && error !== null && 'details' in error ? { details: error.details } : {}),
      });
    }

    return new ProductImageUploadError('upload-failed', 'Cloudinary upload failed');
  }
}
