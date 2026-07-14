import type { RestaurantAnalyticsQuery, RestaurantAnalyticsReport } from '../../domain/restaurant-analytics.models';

export const RESTAURANT_ANALYTICS_REPOSITORY = Symbol('RESTAURANT_ANALYTICS_REPOSITORY');

export interface RestaurantAnalyticsRepository {
  getReport(query: RestaurantAnalyticsQuery): Promise<RestaurantAnalyticsReport>;
}
