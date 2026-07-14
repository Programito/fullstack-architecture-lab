import { Controller, Get, Param, Query, UseGuards, Version } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { GetRestaurantAnalyticsReportUseCase } from '../../application/use-cases/get-restaurant-analytics-report.use-case';
import { RestaurantAnalyticsQueryDto } from './dto/restaurant-analytics-query.dto';
import { RestaurantAnalyticsReportDto } from './dto/restaurant-analytics-report.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantAnalyticsController {
  constructor(private readonly getRestaurantAnalyticsReport: GetRestaurantAnalyticsReportUseCase) {}

  @Get(':id/analytics/report')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('dashboard')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantAnalyticsReportDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async getReport(
    @Param('id') restaurantId: string,
    @Query() query: RestaurantAnalyticsQueryDto,
  ): Promise<RestaurantAnalyticsReportDto> {
    return RestaurantAnalyticsReportDto.fromDomain(
      unwrapResultOrThrow(
        await this.getRestaurantAnalyticsReport.execute({ restaurantId, from: query.from, to: query.to }),
      ),
    );
  }
}
