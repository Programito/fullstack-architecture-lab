import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Req, Res, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): HttpResponse };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { OpenRestaurantOrderUseCase } from '../../application/use-cases/open-restaurant-order.use-case';
import { AddRestaurantOrderLineUseCase } from '../../application/use-cases/add-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineUseCase } from '../../application/use-cases/update-restaurant-order-line.use-case';
import { DeleteRestaurantOrderLineUseCase } from '../../application/use-cases/delete-restaurant-order-line.use-case';
import { CancelRestaurantOrderLineUseCase } from '../../application/use-cases/cancel-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineStatusUseCase } from '../../application/use-cases/update-restaurant-order-line-status.use-case';
import { FreeRestaurantServicePointUseCase } from '../../application/use-cases/free-restaurant-service-point.use-case';
import { RegisterRestaurantOrderPaymentUseCase } from '../../application/use-cases/register-restaurant-order-payment.use-case';
import { ChargeRestaurantServicePointUseCase } from '../../application/use-cases/charge-restaurant-service-point.use-case';
import { SendRestaurantServicePointOrderToKitchenUseCase } from '../../application/use-cases/send-restaurant-service-point-order-to-kitchen.use-case';
import { MarkRestaurantServicePointOrderServedUseCase } from '../../application/use-cases/mark-restaurant-service-point-order-served.use-case';
import { RestaurantOrderResponseDto } from './dto/restaurant-order-response.dto';
import { ServicePointDetailResponseDto } from './dto/service-point-detail-response.dto';
import { OpenRestaurantOrderDto } from './dto/open-restaurant-order.dto';
import { AddRestaurantOrderLineDto } from './dto/add-restaurant-order-line.dto';
import { UpdateRestaurantOrderLineDto } from './dto/update-restaurant-order-line.dto';
import { CancelRestaurantOrderLineDto } from './dto/cancel-restaurant-order-line.dto';
import { UpdateRestaurantOrderLineStatusDto } from './dto/update-restaurant-order-line-status.dto';
import { RegisterRestaurantOrderPaymentDto } from './dto/register-restaurant-order-payment.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantOrderController {
  constructor(
    private readonly openRestaurantOrder: OpenRestaurantOrderUseCase,
    private readonly addRestaurantOrderLine: AddRestaurantOrderLineUseCase,
    private readonly updateRestaurantOrderLine: UpdateRestaurantOrderLineUseCase,
    private readonly deleteRestaurantOrderLine: DeleteRestaurantOrderLineUseCase,
    private readonly cancelRestaurantOrderLine: CancelRestaurantOrderLineUseCase,
    private readonly updateRestaurantOrderLineStatus: UpdateRestaurantOrderLineStatusUseCase,
    private readonly freeRestaurantServicePoint: FreeRestaurantServicePointUseCase,
    private readonly registerRestaurantOrderPayment: RegisterRestaurantOrderPaymentUseCase,
    private readonly chargeRestaurantServicePoint: ChargeRestaurantServicePointUseCase,
    private readonly sendRestaurantServicePointOrderToKitchen: SendRestaurantServicePointOrderToKitchenUseCase,
    private readonly markRestaurantServicePointOrderServed: MarkRestaurantServicePointOrderServedUseCase,
  ) {}

  @Post(':id/service-points/:tableId/orders')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
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
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
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
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
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
        await this.updateRestaurantOrderLine.execute({ restaurantId, orderId, lineId, quantity: body.quantity, kitchenNote: body.kitchenNote }),
      ),
    );
  }

  @Delete(':id/orders/:orderId/lines/:lineId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantOrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Order or line not found.' })
  async deleteOrderLine(
    @Param('id') restaurantId: string,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
  ): Promise<RestaurantOrderResponseDto> {
    return RestaurantOrderResponseDto.fromDomain(
      unwrapResultOrThrow(await this.deleteRestaurantOrderLine.execute({ restaurantId, orderId, lineId })),
    );
  }

  @Post(':id/orders/:orderId/lines/:lineId/cancel')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
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
        await this.cancelRestaurantOrderLine.execute({ restaurantId, orderId, lineId, reason: body.reason.trim() }),
      ),
    );
  }

  @Patch(':id/orders/:orderId/lines/:lineId/status')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('kitchen')
  @RequireRestaurantScope()
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
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
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

  @Post(':id/service-points/:tableId/send-to-kitchen')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('kitchen')
  @RequireRestaurantScope()
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
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('kitchen')
  @RequireRestaurantScope()
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
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
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
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('service')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: ServicePointDetailResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Restaurant or table not found.' })
  async freeServicePoint(@Param('id') restaurantId: string, @Param('tableId') tableId: string): Promise<ServicePointDetailResponseDto> {
    return ServicePointDetailResponseDto.fromDomain(
      unwrapResultOrThrow(await this.freeRestaurantServicePoint.execute(restaurantId, tableId)),
    );
  }
}
