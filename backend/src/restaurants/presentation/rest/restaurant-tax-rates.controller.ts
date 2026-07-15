import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Res, UseGuards, Version } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): { send(): void } };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { ListTaxRatesUseCase } from '../../application/use-cases/list-tax-rates.use-case';
import { CreateTaxRateUseCase } from '../../application/use-cases/create-tax-rate.use-case';
import { UpdateTaxRateUseCase } from '../../application/use-cases/update-tax-rate.use-case';
import { DeleteTaxRateUseCase } from '../../application/use-cases/delete-tax-rate.use-case';
import { CreateTaxRateDto, UpdateTaxRateDto } from './dto/create-tax-rate.dto';
import { TaxRateResponseDto } from './dto/tax-rate-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantTaxRatesController {
  constructor(
    private readonly listUseCase: ListTaxRatesUseCase,
    private readonly createUseCase: CreateTaxRateUseCase,
    private readonly updateUseCase: UpdateTaxRateUseCase,
    private readonly deleteUseCase: DeleteTaxRateUseCase,
  ) {}

  @Get(':id/tax-rates')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: TaxRateResponseDto, isArray: true })
  @ApiUnauthorizedResponse()
  async listTaxRates(@Param('id') id: string): Promise<TaxRateResponseDto[]> {
    return unwrapResultOrThrow(await this.listUseCase.execute({ restaurantId: id })).map(TaxRateResponseDto.from);
  }

  @Post(':id/tax-rates')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: TaxRateResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async createTaxRate(
    @Param('id') id: string,
    @Body() body: CreateTaxRateDto,
  ): Promise<TaxRateResponseDto> {
    const result = await this.createUseCase.execute({
      restaurantId: id,
      name: body.name,
      ratePercent: body.ratePercent,
    });
    return TaxRateResponseDto.from(unwrapResultOrThrow(result));
  }

  @Patch(':id/tax-rates/:taxRateId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: TaxRateResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async updateTaxRate(
    @Param('id') id: string,
    @Param('taxRateId') taxRateId: string,
    @Body() body: UpdateTaxRateDto,
  ): Promise<TaxRateResponseDto> {
    const result = await this.updateUseCase.execute({
      restaurantId: id,
      taxRateId,
      name: body.name,
      ratePercent: body.ratePercent,
      isActive: body.isActive,
    });
    return TaxRateResponseDto.from(unwrapResultOrThrow(result));
  }

  @Delete(':id/tax-rates/:taxRateId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async deleteTaxRate(
    @Param('id') id: string,
    @Param('taxRateId') taxRateId: string,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.deleteUseCase.execute({ restaurantId: id, taxRateId }));
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
