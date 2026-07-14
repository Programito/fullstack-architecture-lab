import { Controller, Get, Req, UseGuards, Version } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { ListRestaurantsUseCase } from '../../application/use-cases/list-restaurants.use-case';
import { RestaurantSummaryResponseDto } from './dto/restaurant-summary-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly listRestaurants: ListRestaurantsUseCase) {}

  @Get()
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: RestaurantSummaryResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async list(@Req() req: AuthenticatedRequest): Promise<RestaurantSummaryResponseDto[]> {
    const restaurants = unwrapResultOrThrow(
      await this.listRestaurants.execute(req.auth.scopes.restaurants, req.auth.scopes.organizations),
    );
    return restaurants.map(RestaurantSummaryResponseDto.fromDomain);
  }
}
