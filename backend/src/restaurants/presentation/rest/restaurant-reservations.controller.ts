import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { AuditService } from '../../../observability/application/audit.service';
import { auditContext } from '../../../observability/application/audit-context';
import { ListRestaurantReservationsUseCase } from '../../application/use-cases/list-restaurant-reservations.use-case';
import { CreateRestaurantReservationUseCase } from '../../application/use-cases/create-restaurant-reservation.use-case';
import { UpdateRestaurantReservationStatusUseCase } from '../../application/use-cases/update-restaurant-reservation-status.use-case';
import { RestaurantReservationResponseDto } from './dto/restaurant-reservation-response.dto';
import { CreateRestaurantReservationDto } from './dto/create-restaurant-reservation.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantReservationsController {
  constructor(
    private readonly listRestaurantReservations: ListRestaurantReservationsUseCase,
    private readonly createRestaurantReservation: CreateRestaurantReservationUseCase,
    private readonly updateRestaurantReservationStatus: UpdateRestaurantReservationStatusUseCase,
    private readonly audit: AuditService,
  ) {}

  @Get(':id/reservations')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantReservationResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async reservations(@Param('id') id: string, @Query('date') date?: string): Promise<RestaurantReservationResponseDto[]> {
    const reservations = unwrapResultOrThrow(await this.listRestaurantReservations.execute(id, date));
    return reservations.map(RestaurantReservationResponseDto.fromDomain);
  }

  @Post(':id/reservations')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: RestaurantReservationResponseDto })
  @ApiBadRequestResponse({ description: 'Reservation creation is invalid.' })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async createReservation(
    @Param('id') restaurantId: string,
    @Body() body: CreateRestaurantReservationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RestaurantReservationResponseDto> {
    const reservation = unwrapResultOrThrow(
      await this.createRestaurantReservation.execute({
        restaurantId,
        customerNameSnapshot: body.customerNameSnapshot,
        customerPhoneSnapshot: body.customerPhoneSnapshot ?? null,
        partySize: body.partySize,
        reservationAt: body.reservationAt,
        durationMinutes: body.durationMinutes ?? 90,
        notes: body.notes ?? null,
        tableIds: body.tableIds ?? [],
      }),
    );
    await this.audit.record({
      ...auditContext(request, restaurantId),
      event: 'reservation.created',
      message: `Reservation ${reservation.id} created.`,
      result: 'succeeded',
      entityType: 'reservation',
      entityId: reservation.id,
      entityLabel: reservation.customerNameSnapshot,
      changedFields: ['customerNameSnapshot', 'customerPhoneSnapshot', 'partySize', 'reservationAt', 'durationMinutes', 'notes', 'tableIds', 'status'],
      metadata: { reservationId: reservation.id, partySize: reservation.partySize, status: reservation.status },
    });
    return RestaurantReservationResponseDto.fromDomain(reservation);
  }

  @Patch(':id/reservations/:reservationId/confirm')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantReservationResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or reservation not found.' })
  @ApiBadRequestResponse({ description: 'Reservation transition not allowed.' })
  async confirmReservation(
    @Param('id') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RestaurantReservationResponseDto> {
    return this.updateReservationStatus(request, restaurantId, reservationId, 'confirmed');
  }

  @Patch(':id/reservations/:reservationId/seat')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantReservationResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or reservation not found.' })
  @ApiBadRequestResponse({ description: 'Reservation transition not allowed.' })
  async seatReservation(
    @Param('id') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RestaurantReservationResponseDto> {
    return this.updateReservationStatus(request, restaurantId, reservationId, 'seated');
  }

  @Patch(':id/reservations/:reservationId/no-show')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantReservationResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or reservation not found.' })
  @ApiBadRequestResponse({ description: 'Reservation transition not allowed.' })
  async markReservationNoShow(
    @Param('id') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RestaurantReservationResponseDto> {
    return this.updateReservationStatus(request, restaurantId, reservationId, 'no_show');
  }

  @Patch(':id/reservations/:reservationId/cancel')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantReservationResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant or reservation not found.' })
  @ApiBadRequestResponse({ description: 'Reservation transition not allowed.' })
  async cancelReservation(
    @Param('id') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RestaurantReservationResponseDto> {
    return this.updateReservationStatus(request, restaurantId, reservationId, 'cancelled');
  }

  private async updateReservationStatus(
    request: AuthenticatedRequest,
    restaurantId: string,
    reservationId: string,
    status: 'confirmed' | 'seated' | 'no_show' | 'cancelled',
  ): Promise<RestaurantReservationResponseDto> {
    const reservation = unwrapResultOrThrow(
      await this.updateRestaurantReservationStatus.execute({ restaurantId, reservationId, status }),
    );
    await this.audit.record({
      ...auditContext(request, restaurantId),
      event: 'reservation.updated',
      message: `Reservation ${reservationId} changed to ${status}.`,
      result: 'succeeded',
      entityType: 'reservation',
      entityId: reservationId,
      entityLabel: reservation.customerNameSnapshot,
      changedFields: ['status'],
      metadata: { reservationId, status },
    });
    return RestaurantReservationResponseDto.fromDomain(reservation);
  }
}
