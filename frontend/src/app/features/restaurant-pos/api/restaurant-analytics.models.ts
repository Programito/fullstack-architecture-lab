export type PaymentMethod = 'cash' | 'card' | 'bizum' | 'other';

export type RestaurantAnalyticsFilters = {
  from: string;
  to: string;
};

export type RestaurantAnalyticsSummaryDto = {
  revenueCents: number;
  ordersCount: number;
  averageTicketCents: number;
  averageTableTurnoverMinutes: number;
};

export type SalesByDayPointDto = {
  date: string;
  revenueCents: number;
  ordersCount: number;
};

export type TopProductEntryDto = {
  productName: string;
  quantity: number;
  revenueCents: number;
};

export type PaymentBreakdownEntryDto = {
  method: PaymentMethod;
  amountCents: number;
  count: number;
};

export type PeakHourEntryDto = {
  hour: number;
  ordersCount: number;
};

export type RestaurantAnalyticsReportDto = {
  summary: RestaurantAnalyticsSummaryDto;
  previousSummary: RestaurantAnalyticsSummaryDto;
  salesByDay: SalesByDayPointDto[];
  topProducts: TopProductEntryDto[];
  paymentBreakdown: PaymentBreakdownEntryDto[];
  peakHours: PeakHourEntryDto[];
};
