import { Body, Controller, Get, Param, Patch, Post, Put, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { GetRestaurantFloorsUseCase } from '../../application/use-cases/get-restaurant-floors.use-case';
import { GetRestaurantMenuUseCase } from '../../application/use-cases/get-restaurant-menu.use-case';
import { ListRestaurantReservationsUseCase } from '../../application/use-cases/list-restaurant-reservations.use-case';
import { ListRestaurantsUseCase } from '../../application/use-cases/list-restaurants.use-case';
import { CreateFloorElementUseCase } from '../../application/use-cases/create-floor-element.use-case';
import { ReorderFloorElementsUseCase } from '../../application/use-cases/reorder-floor-elements.use-case';
import { UpdateFloorElementUseCase } from '../../application/use-cases/update-floor-element.use-case';
import { UpdateRestaurantFloorUseCase } from '../../application/use-cases/update-restaurant-floor.use-case';
import { CreateFloorElementDto } from './dto/create-floor-element.dto';
import { ReorderFloorElementsDto } from './dto/reorder-floor-elements.dto';
import { UpdateFloorElementDto } from './dto/update-floor-element.dto';
import { UpdateRestaurantFloorDto } from './dto/update-restaurant-floor.dto';
import { RestaurantFloorsResponseDto } from './dto/restaurant-floors-response.dto';
import { RestaurantMenuResponseDto } from './dto/restaurant-menu-response.dto';
import { RestaurantReservationResponseDto } from './dto/restaurant-reservation-response.dto';
import { RestaurantSummaryResponseDto } from './dto/restaurant-summary-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly listRestaurants: ListRestaurantsUseCase,
    private readonly getRestaurantMenu: GetRestaurantMenuUseCase,
    private readonly getRestaurantFloors: GetRestaurantFloorsUseCase,
    private readonly listRestaurantReservations: ListRestaurantReservationsUseCase,
    private readonly createFloorElement: CreateFloorElementUseCase,
    private readonly reorderFloorElements: ReorderFloorElementsUseCase,
    private readonly updateFloorElement: UpdateFloorElementUseCase,
    private readonly updateRestaurantFloor: UpdateRestaurantFloorUseCase,
  ) {}

  @Get()
  @Version('1')
  @ApiOkResponse({ type: RestaurantSummaryResponseDto, isArray: true })
  async list(): Promise<RestaurantSummaryResponseDto[]> {
    const restaurants = unwrapResultOrThrow(await this.listRestaurants.execute());
    return restaurants.map(RestaurantSummaryResponseDto.fromDomain);
  }

  @Get(':id/menu')
  @Version('1')
  @ApiOkResponse({ type: RestaurantMenuResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async menu(@Param('id') id: string): Promise<RestaurantMenuResponseDto> {
    return RestaurantMenuResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantMenu.execute(id)));
  }

  @Get(':id/floors')
  @Version('1')
  @ApiOkResponse({ type: RestaurantFloorsResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async floors(@Param('id') id: string): Promise<RestaurantFloorsResponseDto> {
    return RestaurantFloorsResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantFloors.execute(id)));
  }

  @Post(':id/floors/:floorId/elements')
  @Version('1')
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

  @Get(':id/reservations')
  @Version('1')
  @ApiOkResponse({ type: RestaurantReservationResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async reservations(@Param('id') id: string): Promise<RestaurantReservationResponseDto[]> {
    const reservations = unwrapResultOrThrow(await this.listRestaurantReservations.execute(id));
    return reservations.map(RestaurantReservationResponseDto.fromDomain);
  }
}
