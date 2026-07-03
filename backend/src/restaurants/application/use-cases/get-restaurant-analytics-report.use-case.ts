import { Inject, Injectable } from '@nestjs/common';

import { analyticsRangeTooWide, invalidAnalyticsRange, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantAnalyticsQuery, RestaurantAnalyticsReport } from '../../domain/restaurant-analytics.models';
import { RESTAURANT_ANALYTICS_REPOSITORY, type RestaurantAnalyticsRepository } from '../ports/restaurant-analytics-repository.port';

const MAX_ANALYTICS_RANGE_DAYS = 366;
const MAX_ANALYTICS_RANGE_MS = MAX_ANALYTICS_RANGE_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class GetRestaurantAnalyticsReportUseCase {
  constructor(@Inject(RESTAURANT_ANALYTICS_REPOSITORY) private readonly analytics: RestaurantAnalyticsRepository) {}

  async execute(query: RestaurantAnalyticsQuery): Promise<Result<RestaurantAnalyticsReport, ApplicationError>> {
    const fromMs = new Date(query.from).getTime();
    const toMs = new Date(query.to).getTime();

    if (fromMs > toMs) {
      return err(invalidAnalyticsRange(query.from, query.to));
    }

    if (toMs - fromMs > MAX_ANALYTICS_RANGE_MS) {
      return err(analyticsRangeTooWide(query.from, query.to, MAX_ANALYTICS_RANGE_DAYS));
    }

    const report = await this.analytics.getReport(query);
    return ok(report);
  }
}
