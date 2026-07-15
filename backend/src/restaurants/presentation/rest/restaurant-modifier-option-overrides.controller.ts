import { Body, Controller, Delete, Get, HttpStatus, Param, Put, Res, UseGuards, Version } from '@nestjs/common';
import { ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): { send(): void } };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { ListModifierOptionOverridesUseCase } from '../../application/use-cases/list-modifier-option-overrides.use-case';
import { SetModifierOptionPriceOverrideUseCase } from '../../application/use-cases/set-modifier-option-price-override.use-case';
import { ClearModifierOptionPriceOverrideUseCase } from '../../application/use-cases/clear-modifier-option-price-override.use-case';
import { SetModifierOptionPriceOverrideDto } from './dto/set-modifier-option-price-override.dto';
import { ModifierOptionOverrideResponseDto } from './dto/modifier-option-override-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantModifierOptionOverridesController {
  constructor(
    private readonly listUseCase: ListModifierOptionOverridesUseCase,
    private readonly setUseCase: SetModifierOptionPriceOverrideUseCase,
    private readonly clearUseCase: ClearModifierOptionPriceOverrideUseCase,
  ) {}

  @Get(':id/products/:productId/modifier-option-overrides')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ModifierOptionOverrideResponseDto, isArray: true })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async listOverrides(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ): Promise<ModifierOptionOverrideResponseDto[]> {
    const result = await this.listUseCase.execute({ restaurantId: id, restaurantProductId: productId });
    return unwrapResultOrThrow(result).map(ModifierOptionOverrideResponseDto.from);
  }

  @Put(':id/products/:productId/modifier-options/:optionId/price-override')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ModifierOptionOverrideResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async setOverride(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Param('optionId') optionId: string,
    @Body() body: SetModifierOptionPriceOverrideDto,
  ): Promise<ModifierOptionOverrideResponseDto> {
    const result = await this.setUseCase.execute({
      restaurantId: id,
      restaurantProductId: productId,
      modifierOptionId: optionId,
      priceDeltaCents: body.priceDeltaCents,
    });
    return ModifierOptionOverrideResponseDto.from(unwrapResultOrThrow(result));
  }

  @Delete(':id/products/:productId/modifier-options/:optionId/price-override')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async clearOverride(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Param('optionId') optionId: string,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(
      await this.clearUseCase.execute({ restaurantId: id, restaurantProductId: productId, modifierOptionId: optionId }),
    );
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
