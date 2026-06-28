import { Body, Controller, Get, Param, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { GetRestaurantServiceWindowsUseCase } from '../../application/use-cases/get-restaurant-service-windows.use-case';
import { UpdateRestaurantServiceWindowsUseCase } from '../../application/use-cases/update-restaurant-service-windows.use-case';
import { ServiceWindowResponseDto } from './dto/service-window-response.dto';
import { UpdateServiceWindowsDto } from './dto/update-service-windows.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantServiceController {
  constructor(
    private readonly getRestaurantServiceWindowsUC: GetRestaurantServiceWindowsUseCase,
    private readonly updateRestaurantServiceWindowsUC: UpdateRestaurantServiceWindowsUseCase,
  ) {}

  @Get(':id/service-windows')
  @Version('1')
  @ApiOkResponse({ type: ServiceWindowResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async getServiceWindows(@Param('id') id: string): Promise<ServiceWindowResponseDto[]> {
    const windows = unwrapResultOrThrow(await this.getRestaurantServiceWindowsUC.execute(id));
    return windows.map(ServiceWindowResponseDto.fromDomain);
  }

  @Put(':id/service-windows')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: ServiceWindowResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid service windows configuration.' })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async updateServiceWindows(
    @Param('id') id: string,
    @Body() body: UpdateServiceWindowsDto,
  ): Promise<ServiceWindowResponseDto[]> {
    const windows = unwrapResultOrThrow(
      await this.updateRestaurantServiceWindowsUC.execute({ restaurantId: id, windows: body.windows }),
    );
    return windows.map(ServiceWindowResponseDto.fromDomain);
  }
}
