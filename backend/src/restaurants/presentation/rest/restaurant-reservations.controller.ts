import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
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
  ): Promise<RestaurantReservationResponseDto> {
    return RestaurantReservationResponseDto.fromDomain(
      unwrapResultOrThrow(
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
      ),
    );
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
  ): Promise<RestaurantReservationResponseDto> {
    return RestaurantReservationResponseDto.fromDomain(
      unwrapResultOrThrow(await this.updateRestaurantReservationStatus.execute({ restaurantId, reservationId, status: 'confirmed' })),
    );
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
  ): Promise<RestaurantReservationResponseDto> {
    return RestaurantReservationResponseDto.fromDomain(
      unwrapResultOrThrow(await this.updateRestaurantReservationStatus.execute({ restaurantId, reservationId, status: 'seated' })),
    );
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
  ): Promise<RestaurantReservationResponseDto> {
    return RestaurantReservationResponseDto.fromDomain(
      unwrapResultOrThrow(await this.updateRestaurantReservationStatus.execute({ restaurantId, reservationId, status: 'no_show' })),
    );
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
  ): Promise<RestaurantReservationResponseDto> {
    return RestaurantReservationResponseDto.fromDomain(
      unwrapResultOrThrow(await this.updateRestaurantReservationStatus.execute({ restaurantId, reservationId, status: 'cancelled' })),
    );
  }
}
