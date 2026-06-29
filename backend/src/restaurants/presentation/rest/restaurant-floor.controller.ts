import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { GetRestaurantFloorsUseCase } from '../../application/use-cases/get-restaurant-floors.use-case';
import { GetRestaurantServiceFloorUseCase } from '../../application/use-cases/get-restaurant-service-floor.use-case';
import { GetRestaurantServicePointUseCase } from '../../application/use-cases/get-restaurant-service-point.use-case';
import { GetRestaurantServicePointOrderUseCase } from '../../application/use-cases/get-restaurant-service-point-order.use-case';
import { OccupyRestaurantServicePointUseCase } from '../../application/use-cases/occupy-restaurant-service-point.use-case';
import { CreateFloorElementUseCase } from '../../application/use-cases/create-floor-element.use-case';
import { ReorderFloorElementsUseCase } from '../../application/use-cases/reorder-floor-elements.use-case';
import { UpdateFloorElementUseCase } from '../../application/use-cases/update-floor-element.use-case';
import { UpdateRestaurantFloorUseCase } from '../../application/use-cases/update-restaurant-floor.use-case';
import { RestaurantFloorsResponseDto } from './dto/restaurant-floors-response.dto';
import { ServiceFloorResponseDto } from './dto/service-floor-response.dto';
import { ServicePointDetailResponseDto } from './dto/service-point-detail-response.dto';
import { ServicePointOrderResponseDto } from './dto/service-point-order-response.dto';
import { CreateFloorElementDto } from './dto/create-floor-element.dto';
import { ReorderFloorElementsDto } from './dto/reorder-floor-elements.dto';
import { UpdateFloorElementDto } from './dto/update-floor-element.dto';
import { UpdateRestaurantFloorDto } from './dto/update-restaurant-floor.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantFloorController {
  constructor(
    private readonly getRestaurantFloors: GetRestaurantFloorsUseCase,
    private readonly getRestaurantServiceFloor: GetRestaurantServiceFloorUseCase,
    private readonly getRestaurantServicePoint: GetRestaurantServicePointUseCase,
    private readonly getRestaurantServicePointOrder: GetRestaurantServicePointOrderUseCase,
    private readonly occupyRestaurantServicePoint: OccupyRestaurantServicePointUseCase,
    private readonly createFloorElement: CreateFloorElementUseCase,
    private readonly reorderFloorElements: ReorderFloorElementsUseCase,
    private readonly updateFloorElement: UpdateFloorElementUseCase,
    private readonly updateRestaurantFloor: UpdateRestaurantFloorUseCase,
  ) {}

  @Get(':id/floors')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantFloorsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async floors(@Param('id') id: string): Promise<RestaurantFloorsResponseDto> {
    return RestaurantFloorsResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantFloors.execute(id)));
  }

  @Get(':id/service-floor')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ServiceFloorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async serviceFloor(@Param('id') id: string): Promise<ServiceFloorResponseDto> {
    return ServiceFloorResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantServiceFloor.execute(id)));
  }

  @Get(':id/service-points/:tableId')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ServicePointDetailResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async servicePoint(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantServicePoint.execute(id, tableId)));
  }

  @Get(':id/service-points/:tableId/order')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ServicePointOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async servicePointOrder(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointOrderResponseDto> {
    return ServicePointOrderResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantServicePointOrder.execute(id, tableId)));
  }

  @Post(':id/service-points/:tableId/occupy')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: ServicePointDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async occupyServicePoint(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(unwrapResultOrThrow(await this.occupyRestaurantServicePoint.execute(id, tableId)));
  }

  @Post(':id/floors/:floorId/elements')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('layout')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: RestaurantFloorsResponseDto })
  @ApiBadRequestResponse({ description: 'Floor element layout is invalid.' })
  @ApiNotFoundResponse({ description: 'Restaurant or floor not found.' })
  async createElement(
    @Param('id') id: string,
    @Param('floorId') floorId: string,
    @Body() body: CreateFloorElementDto,
  ): Promise<RestaurantFloorsResponseDto> {
    return RestaurantFloorsResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.createFloorElement.execute({
          restaurantId: id,
          floorId,
          type: body.type,
          label: body.label,
          x: body.x,
          y: body.y,
          width: body.width,
          height: body.height,
          tableId: body.tableId ?? null,
          shape: body.shape ?? null,
          sortOrder: body.sortOrder,
        }),
      ),
    );
  }

  @Patch(':id/floors/:floorId/elements/:elementId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('layout')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantFloorsResponseDto })
  @ApiBadRequestResponse({ description: 'Floor element layout is invalid.' })
  @ApiNotFoundResponse({ description: 'Restaurant, floor, or floor element not found.' })
  async updateElement(
    @Param('id') id: string,
    @Param('floorId') floorId: string,
    @Param('elementId') elementId: string,
    @Body() body: UpdateFloorElementDto,
  ): Promise<RestaurantFloorsResponseDto> {
    return RestaurantFloorsResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.updateFloorElement.execute({
          restaurantId: id,
          floorId,
          elementId,
          label: body.label,
          x: body.x,
          y: body.y,
          width: body.width,
          height: body.height,
          shape: body.shape ?? null,
          capacity: body.capacity ?? null,
        }),
      ),
    );
  }

  @Patch(':id/floors/:floorId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('layout')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantFloorsResponseDto })
  @ApiBadRequestResponse({ description: 'Floor layout is invalid.' })
  @ApiNotFoundResponse({ description: 'Restaurant or floor not found.' })
  async updateFloor(
    @Param('id') id: string,
    @Param('floorId') floorId: string,
    @Body() body: UpdateRestaurantFloorDto,
  ): Promise<RestaurantFloorsResponseDto> {
    return RestaurantFloorsResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.updateRestaurantFloor.execute({
          restaurantId: id,
          floorId,
          name: body.name,
          rows: body.rows,
          columns: body.columns,
        }),
      ),
    );
  }

  @Put(':id/floors/:floorId/elements/reorder')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('layout')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantFloorsResponseDto })
  @ApiBadRequestResponse({ description: 'Floor element layout is invalid.' })
  @ApiNotFoundResponse({ description: 'Restaurant or floor not found.' })
  async reorderElements(
    @Param('id') id: string,
    @Param('floorId') floorId: string,
    @Body() body: ReorderFloorElementsDto,
  ): Promise<RestaurantFloorsResponseDto> {
    return RestaurantFloorsResponseDto.fromDomain(
      unwrapResultOrThrow(await this.reorderFloorElements.execute({ restaurantId: id, floorId, elements: body.elements })),
    );
  }
}
