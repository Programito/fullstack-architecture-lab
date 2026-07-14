import type { PaymentMethod } from './restaurant-order.models';

export type RestaurantAnalyticsQuery = {
  restaurantId: string;
  from: string;
  to: string;
};

export type RestaurantAnalyticsSummary = {
  revenueCents: number;
  ordersCount: number;
  averageTicketCents: number;
  averageTableTurnoverMinutes: number;
};

export type SalesByDayPoint = {
  date: string;
  revenueCents: number;
  ordersCount: number;
};

export type TopProductEntry = {
  productName: string;
  quantity: number;
  revenueCents: number;
};

export type PaymentBreakdownEntry = {
  method: PaymentMethod;
  amountCents: number;
  count: number;
};

export type PeakHourEntry = {
  hour: number;
  ordersCount: number;
};

export type RestaurantAnalyticsReport = {
  summary: RestaurantAnalyticsSummary;
  previousSummary: RestaurantAnalyticsSummary;
  salesByDay: SalesByDayPoint[];
  // Aligned to `salesByDay` by day offset, not calendar date: the previous
  // period rarely shares dates with the current one.
  previousSalesByDay: SalesByDayPoint[];
  topProducts: TopProductEntry[];
  paymentBreakdown: PaymentBreakdownEntry[];
  peakHours: PeakHourEntry[];
};
