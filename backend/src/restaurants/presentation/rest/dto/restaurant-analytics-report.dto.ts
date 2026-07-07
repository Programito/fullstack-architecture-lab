import { ApiProperty } from '@nestjs/swagger';

import type {
  PaymentBreakdownEntry,
  PeakHourEntry,
  RestaurantAnalyticsReport,
  RestaurantAnalyticsSummary,
  SalesByDayPoint,
  TopProductEntry,
} from '../../../domain/restaurant-analytics.models';

export class RestaurantAnalyticsSummaryDto {
  @ApiProperty() revenueCents!: number;
  @ApiProperty() ordersCount!: number;
  @ApiProperty() averageTicketCents!: number;
  @ApiProperty() averageTableTurnoverMinutes!: number;

  static fromDomain(summary: RestaurantAnalyticsSummary): RestaurantAnalyticsSummaryDto {
    return Object.assign(new RestaurantAnalyticsSummaryDto(), summary);
  }
}

export class SalesByDayPointDto {
  @ApiProperty() date!: string;
  @ApiProperty() revenueCents!: number;
  @ApiProperty() ordersCount!: number;

  static fromDomain(point: SalesByDayPoint): SalesByDayPointDto {
    return Object.assign(new SalesByDayPointDto(), point);
  }
}

export class TopProductEntryDto {
  @ApiProperty() productName!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() revenueCents!: number;

  static fromDomain(entry: TopProductEntry): TopProductEntryDto {
    return Object.assign(new TopProductEntryDto(), entry);
  }
}

export class PaymentBreakdownEntryDto {
  @ApiProperty() method!: string;
  @ApiProperty() amountCents!: number;
  @ApiProperty() count!: number;

  static fromDomain(entry: PaymentBreakdownEntry): PaymentBreakdownEntryDto {
    return Object.assign(new PaymentBreakdownEntryDto(), entry);
  }
}

export class PeakHourEntryDto {
  @ApiProperty() hour!: number;
  @ApiProperty() ordersCount!: number;

  static fromDomain(entry: PeakHourEntry): PeakHourEntryDto {
    return Object.assign(new PeakHourEntryDto(), entry);
  }
}

export class RestaurantAnalyticsReportDto {
  @ApiProperty({ type: RestaurantAnalyticsSummaryDto }) summary!: RestaurantAnalyticsSummaryDto;
  @ApiProperty({ type: RestaurantAnalyticsSummaryDto }) previousSummary!: RestaurantAnalyticsSummaryDto;
  @ApiProperty({ type: [SalesByDayPointDto] }) salesByDay!: SalesByDayPointDto[];
  @ApiProperty({ type: [SalesByDayPointDto] }) previousSalesByDay!: SalesByDayPointDto[];
  @ApiProperty({ type: [TopProductEntryDto] }) topProducts!: TopProductEntryDto[];
  @ApiProperty({ type: [PaymentBreakdownEntryDto] }) paymentBreakdown!: PaymentBreakdownEntryDto[];
  @ApiProperty({ type: [PeakHourEntryDto] }) peakHours!: PeakHourEntryDto[];

  static fromDomain(report: RestaurantAnalyticsReport): RestaurantAnalyticsReportDto {
    return Object.assign(new RestaurantAnalyticsReportDto(), {
      summary: RestaurantAnalyticsSummaryDto.fromDomain(report.summary),
      previousSummary: RestaurantAnalyticsSummaryDto.fromDomain(report.previousSummary),
      salesByDay: report.salesByDay.map((point) => SalesByDayPointDto.fromDomain(point)),
      previousSalesByDay: report.previousSalesByDay.map((point) => SalesByDayPointDto.fromDomain(point)),
      topProducts: report.topProducts.map((entry) => TopProductEntryDto.fromDomain(entry)),
      paymentBreakdown: report.paymentBreakdown.map((entry) => PaymentBreakdownEntryDto.fromDomain(entry)),
      peakHours: report.peakHours.map((entry) => PeakHourEntryDto.fromDomain(entry)),
    });
  }
}
