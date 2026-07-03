import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { PRODUCT_IMAGE_SIGNING_PORT, type ProductImageSigningPayload, type ProductImageSigningPort } from '../ports/product-image-signing.port';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

export type CreateProductImageUploadSignatureCommand = {
  restaurantId: string;
  fileName?: string;
};

@Injectable()
export class CreateProductImageUploadSignatureUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurantReadRepository: RestaurantReadRepository,
    @Inject(PRODUCT_IMAGE_SIGNING_PORT) private readonly signer: ProductImageSigningPort,
  ) {}

  async execute(
    command: CreateProductImageUploadSignatureCommand,
  ): Promise<Result<ProductImageSigningPayload, ApplicationError>> {
    const restaurants = await this.restaurantReadRepository.listRestaurants([command.restaurantId], []);
    if (restaurants.length === 0) {
      return err(restaurantNotFound(command.restaurantId));
    }

    return ok(
      this.signer.createSignedUpload({
        restaurantId: command.restaurantId,
        fileName: command.fileName,
      }),
    );
  }
}
