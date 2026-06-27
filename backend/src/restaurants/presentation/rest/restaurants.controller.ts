import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Req, Res, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): HttpResponse };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { ChargeRestaurantServicePointUseCase } from '../../application/use-cases/charge-restaurant-service-point.use-case';
import { GetRestaurantFloorsUseCase } from '../../application/use-cases/get-restaurant-floors.use-case';
import { GetRestaurantMenuUseCase } from '../../application/use-cases/get-restaurant-menu.use-case';
import { GetRestaurantServiceFloorUseCase } from '../../application/use-cases/get-restaurant-service-floor.use-case';
import { GetRestaurantServicePointOrderUseCase } from '../../application/use-cases/get-restaurant-service-point-order.use-case';
import { GetRestaurantServicePointUseCase } from '../../application/use-cases/get-restaurant-service-point.use-case';
import { ListRestaurantReservationsUseCase } from '../../application/use-cases/list-restaurant-reservations.use-case';
import { ListRestaurantsUseCase } from '../../application/use-cases/list-restaurants.use-case';
import { MarkRestaurantServicePointOrderServedUseCase } from '../../application/use-cases/mark-restaurant-service-point-order-served.use-case';
import { OccupyRestaurantServicePointUseCase } from '../../application/use-cases/occupy-restaurant-service-point.use-case';
import { SendRestaurantServicePointOrderToKitchenUseCase } from '../../application/use-cases/send-restaurant-service-point-order-to-kitchen.use-case';
import { OpenRestaurantOrderUseCase } from '../../application/use-cases/open-restaurant-order.use-case';
import { AddRestaurantOrderLineUseCase } from '../../application/use-cases/add-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineUseCase } from '../../application/use-cases/update-restaurant-order-line.use-case';
import { DeleteRestaurantOrderLineUseCase } from '../../application/use-cases/delete-restaurant-order-line.use-case';
import { CancelRestaurantOrderLineUseCase } from '../../application/use-cases/cancel-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineStatusUseCase } from '../../application/use-cases/update-restaurant-order-line-status.use-case';
import { FreeRestaurantServicePointUseCase } from '../../application/use-cases/free-restaurant-service-point.use-case';
import { RegisterRestaurantOrderPaymentUseCase } from '../../application/use-cases/register-restaurant-order-payment.use-case';
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
import { ServiceFloorResponseDto } from './dto/service-floor-response.dto';
import { ServicePointDetailResponseDto } from './dto/service-point-detail-response.dto';
import { ServicePointOrderResponseDto } from './dto/service-point-order-response.dto';
import { RestaurantSummaryResponseDto } from './dto/restaurant-summary-response.dto';
import { OpenRestaurantOrderDto } from './dto/open-restaurant-order.dto';
import { AddRestaurantOrderLineDto } from './dto/add-restaurant-order-line.dto';
import { UpdateRestaurantOrderLineDto } from './dto/update-restaurant-order-line.dto';
import { CancelRestaurantOrderLineDto } from './dto/cancel-restaurant-order-line.dto';
import { UpdateRestaurantOrderLineStatusDto } from './dto/update-restaurant-order-line-status.dto';
import { RegisterRestaurantOrderPaymentDto } from './dto/register-restaurant-order-payment.dto';
import { RestaurantOrderResponseDto } from './dto/restaurant-order-response.dto';
import { SetMenuItemAvailabilityDto } from './dto/set-menu-item-availability.dto';
import { SetRestaurantMenuItemAvailabilityUseCase } from '../../application/use-cases/set-restaurant-menu-item-availability.use-case';
import { CreateMenuSectionUseCase } from '../../application/use-cases/create-menu-section.use-case';
import { UpdateMenuSectionUseCase } from '../../application/use-cases/update-menu-section.use-case';
import { DeleteMenuSectionUseCase } from '../../application/use-cases/delete-menu-section.use-case';
import { CreateMenuSectionDto } from './dto/create-menu-section.dto';
import { UpdateMenuSectionDto } from './dto/update-menu-section.dto';
import { MenuSectionResponseDto } from './dto/menu-section-response.dto';
import { AddMenuSectionItemUseCase } from '../../application/use-cases/add-menu-section-item.use-case';
import { UpdateMenuSectionItemUseCase } from '../../application/use-cases/update-menu-section-item.use-case';
import { RemoveMenuSectionItemUseCase } from '../../application/use-cases/remove-menu-section-item.use-case';
import { ReorderMenuSectionsUseCase } from '../../application/use-cases/reorder-menu-sections.use-case';
import { ReorderMenuSectionItemsUseCase } from '../../application/use-cases/reorder-menu-section-items.use-case';
import { ListRestaurantProductsUseCase } from '../../application/use-cases/list-restaurant-products.use-case';
import { AddMenuSectionItemDto } from './dto/add-menu-section-item.dto';
import { UpdateMenuSectionItemDto } from './dto/update-menu-section-item.dto';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';
import { ReorderMenuItemsDto } from './dto/reorder-menu-items.dto';
import { RestaurantProductSummaryResponseDto } from './dto/restaurant-product-summary-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly listRestaurants: ListRestaurantsUseCase,
    private readonly getRestaurantMenu: GetRestaurantMenuUseCase,
    private readonly setMenuItemAvailability: SetRestaurantMenuItemAvailabilityUseCase,
    private readonly openRestaurantOrder: OpenRestaurantOrderUseCase,
    private readonly addRestaurantOrderLine: AddRestaurantOrderLineUseCase,
    private readonly updateRestaurantOrderLine: UpdateRestaurantOrderLineUseCase,
    private readonly deleteRestaurantOrderLine: DeleteRestaurantOrderLineUseCase,
    private readonly cancelRestaurantOrderLine: CancelRestaurantOrderLineUseCase,
    private readonly updateRestaurantOrderLineStatus: UpdateRestaurantOrderLineStatusUseCase,
    private readonly freeRestaurantServicePoint: FreeRestaurantServicePointUseCase,
    private readonly registerRestaurantOrderPayment: RegisterRestaurantOrderPaymentUseCase,
    private readonly getRestaurantFloors: GetRestaurantFloorsUseCase,
    private readonly getRestaurantServiceFloor: GetRestaurantServiceFloorUseCase,
    private readonly getRestaurantServicePoint: GetRestaurantServicePointUseCase,
    private readonly getRestaurantServicePointOrder: GetRestaurantServicePointOrderUseCase,
    private readonly chargeRestaurantServicePoint: ChargeRestaurantServicePointUseCase,
    private readonly occupyRestaurantServicePoint: OccupyRestaurantServicePointUseCase,
    private readonly sendRestaurantServicePointOrderToKitchen: SendRestaurantServicePointOrderToKitchenUseCase,
    private readonly markRestaurantServicePointOrderServed: MarkRestaurantServicePointOrderServedUseCase,
    private readonly listRestaurantReservations: ListRestaurantReservationsUseCase,
    private readonly createFloorElement: CreateFloorElementUseCase,
    private readonly reorderFloorElements: ReorderFloorElementsUseCase,
    private readonly updateFloorElement: UpdateFloorElementUseCase,
    private readonly updateRestaurantFloor: UpdateRestaurantFloorUseCase,
    private readonly createMenuSection: CreateMenuSectionUseCase,
    private readonly updateMenuSection: UpdateMenuSectionUseCase,
    private readonly deleteMenuSection: DeleteMenuSectionUseCase,
    private readonly addMenuSectionItem: AddMenuSectionItemUseCase,
    private readonly updateMenuSectionItem: UpdateMenuSectionItemUseCase,
    private readonly removeMenuSectionItem: RemoveMenuSectionItemUseCase,
    private readonly reorderMenuSections: ReorderMenuSectionsUseCase,
    private readonly reorderMenuSectionItems: ReorderMenuSectionItemsUseCase,
    private readonly listRestaurantProducts: ListRestaurantProductsUseCase,
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

  @Patch(':id/products/:restaurantProductId/availability')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'Availability updated.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Product not found in this restaurant.' })
  async setItemAvailability(
    @Param('id') restaurantId: string,
    @Param('restaurantProductId') restaurantProductId: string,
    @Body() body: SetMenuItemAvailabilityDto,
  ): Promise<void> {
    unwrapResultOrThrow(await this.setMenuItemAvailability.execute(restaurantId, restaurantProductId, body.available));
  }

  @Get(':id/floors')
  @Version('1')
  @ApiOkResponse({ type: RestaurantFloorsResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async floors(@Param('id') id: string): Promise<RestaurantFloorsResponseDto> {
    return RestaurantFloorsResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantFloors.execute(id)));
  }

  @Get(':id/service-floor')
  @Version('1')
  @ApiOkResponse({ type: ServiceFloorResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async serviceFloor(@Param('id') id: string): Promise<ServiceFloorResponseDto> {
    return ServiceFloorResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantServiceFloor.execute(id)));
  }

  @Get(':id/service-points/:tableId')
  @Version('1')
  @ApiOkResponse({ type: ServicePointDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async servicePoint(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantServicePoint.execute(id, tableId)));
  }

  @Get(':id/service-points/:tableId/order')
  @Version('1')
  @ApiOkResponse({ type: ServicePointOrderResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async servicePointOrder(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointOrderResponseDto> {
    return ServicePointOrderResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantServicePointOrder.execute(id, tableId)));
  }

  @Post(':id/service-points/:tableId/orders')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({ type: RestaurantOrderResponseDto, description: 'Order opened (201) or existing active order returned (200).' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Table not found.' })
  @ApiBadRequestResponse({ description: 'Invalid guest count.' })
  async openOrder(
    @Param('id') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() body: OpenRestaurantOrderDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ): Promise<RestaurantOrderResponseDto> {
    const result = unwrapResultOrThrow(
      await this.openRestaurantOrder.execute({
        restaurantId,
        tableId,
        openedByUserId: request.auth.userId,
        guestCount: body.guestCount ?? 1,
      }),
    );
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return RestaurantOrderResponseDto.fromDomain(result.order);
  }

  @Post(':id/orders/:orderId/lines')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({ type: RestaurantOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Order or product not found.' })
  @ApiBadRequestResponse({ description: 'Invalid line configuration.' })
  async addOrderLine(
    @Param('id') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() body: AddRestaurantOrderLineDto,
  ): Promise<RestaurantOrderResponseDto> {
    return RestaurantOrderResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.addRestaurantOrderLine.execute({
          restaurantId,
          orderId,
          restaurantProductId: body.restaurantProductId,
          quantity: body.quantity,
          kitchenNote: body.kitchenNote?.trim() || null,
          modifiers: body.modifiers ?? [],
          comboSlots: body.comboSlots ?? [],
          platterComponents: body.platterComponents ?? [],
        }),
      ),
    );
  }

  @Patch(':id/orders/:orderId/lines/:lineId')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: RestaurantOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Order or line not found.' })
  @ApiBadRequestResponse({ description: 'Invalid update configuration.' })
  async updateOrderLine(
    @Param('id') restaurantId: string,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() body: UpdateRestaurantOrderLineDto,
  ): Promise<RestaurantOrderResponseDto> {
    return RestaurantOrderResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.updateRestaurantOrderLine.execute({
          restaurantId,
          orderId,
          lineId,
          quantity: body.quantity,
          kitchenNote: body.kitchenNote,
        }),
      ),
    );
  }

  @Delete(':id/orders/:orderId/lines/:lineId')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: RestaurantOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Order or line not found.' })
  async deleteOrderLine(
    @Param('id') restaurantId: string,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
  ): Promise<RestaurantOrderResponseDto> {
    return RestaurantOrderResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.deleteRestaurantOrderLine.execute({ restaurantId, orderId, lineId }),
      ),
    );
  }

  @Post(':id/orders/:orderId/lines/:lineId/cancel')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: RestaurantOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Order or line not found.' })
  @ApiBadRequestResponse({ description: 'Cancellation reason required.' })
  async cancelOrderLine(
    @Param('id') restaurantId: string,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() body: CancelRestaurantOrderLineDto,
  ): Promise<RestaurantOrderResponseDto> {
    return RestaurantOrderResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.cancelRestaurantOrderLine.execute({
          restaurantId,
          orderId,
          lineId,
          reason: body.reason.trim(),
        }),
      ),
    );
  }

  @Patch(':id/orders/:orderId/lines/:lineId/status')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: RestaurantOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Order or line not found.' })
  @ApiBadRequestResponse({ description: 'Invalid status transition.' })
  async updateOrderLineStatus(
    @Param('id') restaurantId: string,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() body: UpdateRestaurantOrderLineStatusDto,
  ): Promise<RestaurantOrderResponseDto> {
    return RestaurantOrderResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.updateRestaurantOrderLineStatus.execute({ restaurantId, orderId, lineId, status: body.status }),
      ),
    );
  }

  @Post(':id/orders/:orderId/payments')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({ type: RestaurantOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiBadRequestResponse({ description: 'Invalid amount or payment would exceed balance.' })
  async registerPayment(
    @Param('id') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() body: RegisterRestaurantOrderPaymentDto,
  ): Promise<RestaurantOrderResponseDto> {
    return RestaurantOrderResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.registerRestaurantOrderPayment.execute({ restaurantId, orderId, amountCents: body.amountCents, method: body.method }),
      ),
    );
  }

  @Post(':id/service-points/:tableId/occupy')
  @Version('1')
  @ApiCreatedResponse({ type: ServicePointDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async occupyServicePoint(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(
      unwrapResultOrThrow(await this.occupyRestaurantServicePoint.execute(id, tableId)),
    );
  }

  @Post(':id/service-points/:tableId/send-to-kitchen')
  @Version('1')
  @ApiCreatedResponse({ type: ServicePointDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Service point has no pending lines to send.' })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async sendServicePointToKitchen(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(
      unwrapResultOrThrow(await this.sendRestaurantServicePointOrderToKitchen.execute(id, tableId)),
    );
  }

  @Post(':id/service-points/:tableId/mark-served')
  @Version('1')
  @ApiCreatedResponse({ type: ServicePointDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Service point has no active lines to mark as served.' })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async markServicePointServed(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(
      unwrapResultOrThrow(await this.markRestaurantServicePointOrderServed.execute(id, tableId)),
    );
  }

  @Post(':id/service-points/:tableId/charge')
  @Version('1')
  @ApiCreatedResponse({ type: ServicePointDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Service point cannot be charged in its current state.' })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async chargeServicePoint(@Param('id') id: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(
      unwrapResultOrThrow(await this.chargeRestaurantServicePoint.execute(id, tableId)),
    );
  }

  @Post(':id/service-points/:tableId/free')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({ type: ServicePointDetailResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async freeServicePoint(@Param('id') restaurantId: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(
      unwrapResultOrThrow(await this.freeRestaurantServicePoint.execute(restaurantId, tableId)),
    );
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

  @Post(':id/menus/:menuId/sections')
  @Version('1')
  @ApiCreatedResponse({ type: MenuSectionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid section data.' })
  @ApiNotFoundResponse({ description: 'Menu not found.' })
  async createSection(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Body() body: CreateMenuSectionDto,
  ): Promise<MenuSectionResponseDto> {
    return unwrapResultOrThrow(
      await this.createMenuSection.execute({ restaurantId: id, menuId, name: body.name, isVisible: body.isVisible }),
    );
  }

  @Patch(':id/menus/:menuId/sections/:sectionId')
  @Version('1')
  @ApiOkResponse({ type: MenuSectionResponseDto })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  async updateSection(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: UpdateMenuSectionDto,
  ): Promise<MenuSectionResponseDto> {
    return unwrapResultOrThrow(
      await this.updateMenuSection.execute({ restaurantId: id, menuId, sectionId, name: body.name, isVisible: body.isVisible }),
    );
  }

  @Delete(':id/menus/:menuId/sections/:sectionId')
  @Version('1')
  @ApiOkResponse({ description: 'Section deleted.' })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  async deleteSection(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.deleteMenuSection.execute({ restaurantId: id, menuId, sectionId }));
    res.status(HttpStatus.NO_CONTENT);
  }

  @Post(':id/menus/:menuId/sections/:sectionId/items')
  @Version('1')
  @ApiCreatedResponse({ type: MenuItemResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid item data.' })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  async addSectionItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: AddMenuSectionItemDto,
  ): Promise<MenuItemResponseDto> {
    return unwrapResultOrThrow(
      await this.addMenuSectionItem.execute({
        restaurantId: id,
        menuId,
        sectionId,
        restaurantProductId: body.restaurantProductId,
        displayNameOverride: body.displayNameOverride,
        priceOverrideCents: body.priceOverrideCents,
      }),
    );
  }

  @Patch(':id/menus/:menuId/sections/:sectionId/items/:itemId')
  @Version('1')
  @ApiOkResponse({ type: MenuItemResponseDto })
  @ApiNotFoundResponse({ description: 'Item not found.' })
  async updateSectionItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateMenuSectionItemDto,
  ): Promise<MenuItemResponseDto> {
    return unwrapResultOrThrow(
      await this.updateMenuSectionItem.execute({
        restaurantId: id,
        menuId,
        sectionId,
        itemId,
        displayNameOverride: body.displayNameOverride,
        priceOverrideCents: body.priceOverrideCents,
        isVisible: body.isVisible,
      }),
    );
  }

  @Delete(':id/menus/:menuId/sections/:sectionId/items/:itemId')
  @Version('1')
  @ApiOkResponse({ description: 'Item removed.' })
  @ApiNotFoundResponse({ description: 'Item not found.' })
  async removeSectionItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(
      await this.removeMenuSectionItem.execute({ restaurantId: id, menuId, sectionId, itemId }),
    );
    res.status(HttpStatus.NO_CONTENT);
  }

  @Put(':id/menus/:menuId/sections/reorder')
  @Version('1')
  @ApiOkResponse({ description: 'Sections reordered.' })
  @ApiNotFoundResponse({ description: 'Menu not found.' })
  async reorderSections(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Body() body: ReorderMenuItemsDto,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(
      await this.reorderMenuSections.execute({ restaurantId: id, menuId, items: body.items }),
    );
    res.status(HttpStatus.NO_CONTENT);
  }

  @Put(':id/menus/:menuId/sections/:sectionId/items/reorder')
  @Version('1')
  @ApiOkResponse({ description: 'Items reordered.' })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  async reorderItems(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: ReorderMenuItemsDto,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(
      await this.reorderMenuSectionItems.execute({ restaurantId: id, menuId, sectionId, items: body.items }),
    );
    res.status(HttpStatus.NO_CONTENT);
  }

  @Get(':id/products')
  @Version('1')
  @ApiOkResponse({ type: RestaurantProductSummaryResponseDto, isArray: true })
  async restaurantProducts(@Param('id') id: string): Promise<RestaurantProductSummaryResponseDto[]> {
    return unwrapResultOrThrow(await this.listRestaurantProducts.execute(id));
  }
}
