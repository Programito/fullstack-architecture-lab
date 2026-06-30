import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Res, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): HttpResponse };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { ListRestaurantProductsUseCase } from '../../application/use-cases/list-restaurant-products.use-case';
import { GetRestaurantProductUseCase } from '../../application/use-cases/get-restaurant-product.use-case';
import { CreateRestaurantProductUseCase } from '../../application/use-cases/create-restaurant-product.use-case';
import { UpdateRestaurantProductUseCase } from '../../application/use-cases/update-restaurant-product.use-case';
import { DeleteRestaurantProductUseCase } from '../../application/use-cases/delete-restaurant-product.use-case';
import { RestaurantProductSummaryResponseDto } from './dto/restaurant-product-summary-response.dto';
import { RestaurantProductDetailResponseDto } from './dto/restaurant-product-detail-response.dto';
import { CreateRestaurantProductDto } from './dto/create-restaurant-product.dto';
import { UpdateRestaurantProductDto } from './dto/update-restaurant-product.dto';
import { CreateProductImageUploadSignatureDto } from './dto/create-product-image-upload-signature.dto';
import { ProductImageUploadSignatureResponseDto } from './dto/product-image-upload-signature-response.dto';
import { CreateProductImageUploadSignatureUseCase } from '../../application/use-cases/create-product-image-upload-signature.use-case';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantProductsController {
  constructor(
    private readonly listRestaurantProducts: ListRestaurantProductsUseCase,
    private readonly getRestaurantProductUC: GetRestaurantProductUseCase,
    private readonly createRestaurantProduct: CreateRestaurantProductUseCase,
    private readonly updateRestaurantProduct: UpdateRestaurantProductUseCase,
    private readonly deleteRestaurantProduct: DeleteRestaurantProductUseCase,
    private readonly createProductImageUploadSignature: CreateProductImageUploadSignatureUseCase,
  ) {}

  @Get(':id/products')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantProductSummaryResponseDto, isArray: true })
  @ApiUnauthorizedResponse()
  async restaurantProducts(@Param('id') id: string): Promise<RestaurantProductSummaryResponseDto[]> {
    return unwrapResultOrThrow(await this.listRestaurantProducts.execute(id)).map(RestaurantProductSummaryResponseDto.from);
  }

  @Get(':id/products/:productId')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantProductDetailResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async getRestaurantProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ): Promise<RestaurantProductDetailResponseDto> {
    return RestaurantProductDetailResponseDto.from(unwrapResultOrThrow(await this.getRestaurantProductUC.execute({ restaurantId: id, productId })));
  }

  @Post(':id/products')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: RestaurantProductDetailResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  async createProduct(
    @Param('id') id: string,
    @Body() body: CreateRestaurantProductDto,
  ): Promise<RestaurantProductDetailResponseDto> {
    const result = await this.createRestaurantProduct.execute({
      restaurantId: id,
      name: body.name,
      description: body.description,
      course: body.course,
      preparationRoute: body.preparationRoute,
      priceCents: body.priceCents,
      currency: body.currency,
      imageUrl: body.imageUrl,
      modifierGroupIds: body.modifierGroupIds,
    });
    return RestaurantProductDetailResponseDto.from(unwrapResultOrThrow(result));
  }

  @Patch(':id/products/:productId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantProductDetailResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async updateProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() body: UpdateRestaurantProductDto,
  ): Promise<RestaurantProductDetailResponseDto> {
    const result = await this.updateRestaurantProduct.execute({
      restaurantId: id,
      productId,
      name: body.name,
      description: body.description,
      course: body.course,
      preparationRoute: body.preparationRoute,
      priceCents: body.priceCents,
      isAvailable: body.isAvailable,
      isVisible: body.isVisible,
      imageUrl: body.imageUrl,
      modifierGroupIds: body.modifierGroupIds,
    });
    return RestaurantProductDetailResponseDto.from(unwrapResultOrThrow(result));
  }

  @Post(':id/products/image-upload-signature')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: ProductImageUploadSignatureResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async createImageUploadSignature(
    @Param('id') id: string,
    @Body() body: CreateProductImageUploadSignatureDto,
  ): Promise<ProductImageUploadSignatureResponseDto> {
    const result = await this.createProductImageUploadSignature.execute({
      restaurantId: id,
      fileName: body.fileName,
    });
    return ProductImageUploadSignatureResponseDto.from(unwrapResultOrThrow(result));
  }

  @Delete(':id/products/:productId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async deleteProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.deleteRestaurantProduct.execute({ restaurantId: id, productId }));
    res.status(HttpStatus.NO_CONTENT);
  }
}
