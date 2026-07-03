import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { RestaurantAnalyticsRepository } from '../../application/ports/restaurant-analytics-repository.port';
import type {
  PaymentBreakdownEntry,
  PeakHourEntry,
  RestaurantAnalyticsQuery,
  RestaurantAnalyticsReport,
  SalesByDayPoint,
  TopProductEntry,
} from '../../domain/restaurant-analytics.models';

@Injectable()
export class PrismaRestaurantAnalyticsRepository implements RestaurantAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(query: RestaurantAnalyticsQuery): Promise<RestaurantAnalyticsReport> {
    const { restaurantId } = query;
    const from = new Date(query.from);
    const to = new Date(query.to);
    // Immediately-preceding period of the same duration, used to give the
    // summary KPIs a "vs previous period" comparison.
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - (to.getTime() - from.getTime()));

    const [summary, previousSummary, salesByDay, topProducts, paymentBreakdown, peakHours] = await Promise.all([
      this.getSummary(restaurantId, from, to),
      this.getSummary(restaurantId, previousFrom, previousTo),
      this.getSalesByDay(restaurantId, from, to),
      this.getTopProducts(restaurantId, from, to),
      this.getPaymentBreakdown(restaurantId, from, to),
      this.getPeakHours(restaurantId, from, to),
    ]);

    return { summary, previousSummary, salesByDay, topProducts, paymentBreakdown, peakHours };
  }

  private async getSummary(restaurantId: string, from: Date, to: Date) {
    const [aggregate, turnoverOrders] = await Promise.all([
      this.prisma.order.aggregate({
        where: { restaurantId, status: 'paid', closedAt: { gte: from, lte: to } },
        _sum: { totalCents: true },
        _count: { _all: true },
      }),
      this.prisma.order.findMany({
        where: { restaurantId, status: 'paid', closedAt: { gte: from, lte: to }, tableId: { not: null } },
        select: { createdAt: true, closedAt: true },
      }),
    ]);

    const revenueCents = aggregate._sum.totalCents ?? 0;
    const ordersCount = aggregate._count._all;
    const averageTicketCents = ordersCount > 0 ? Math.round(revenueCents / ordersCount) : 0;

    const turnoverMinutes = turnoverOrders
      .filter((order): order is { createdAt: Date; closedAt: Date } => order.closedAt !== null)
      .map((order) => (order.closedAt.getTime() - order.createdAt.getTime()) / 60000);
    const averageTableTurnoverMinutes = turnoverMinutes.length > 0
      ? Math.round(turnoverMinutes.reduce((total, minutes) => total + minutes, 0) / turnoverMinutes.length)
      : 0;

    return { revenueCents, ordersCount, averageTicketCents, averageTableTurnoverMinutes };
  }

  private async getSalesByDay(restaurantId: string, from: Date, to: Date): Promise<SalesByDayPoint[]> {
    const rows = await this.prisma.$queryRaw<Array<{ day: Date; revenueCents: bigint; ordersCount: bigint }>>(Prisma.sql`
      SELECT
        date_trunc('day', "closedAt") AS day,
        COALESCE(SUM("totalCents"), 0)::bigint AS "revenueCents",
        COUNT(*)::bigint AS "ordersCount"
      FROM "orders"
      WHERE "restaurantId" = ${restaurantId}
        AND "status" = 'paid'
        AND "closedAt" BETWEEN ${from} AND ${to}
      GROUP BY day
      ORDER BY day ASC
    `);

    return rows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      revenueCents: Number(row.revenueCents),
      ordersCount: Number(row.ordersCount),
    }));
  }

  private async getTopProducts(restaurantId: string, from: Date, to: Date): Promise<TopProductEntry[]> {
    const groups = await this.prisma.orderLine.groupBy({
      by: ['productNameSnapshot'],
      where: {
        cancelledAt: null,
        order: { restaurantId, status: 'paid', closedAt: { gte: from, lte: to } },
      },
      _sum: { quantity: true, subtotalCents: true },
      orderBy: { _sum: { subtotalCents: 'desc' } },
      take: 10,
    });

    return groups.map((group) => ({
      productName: group.productNameSnapshot,
      quantity: group._sum.quantity ?? 0,
      revenueCents: group._sum.subtotalCents ?? 0,
    }));
  }

  private async getPaymentBreakdown(restaurantId: string, from: Date, to: Date): Promise<PaymentBreakdownEntry[]> {
    const groups = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { status: 'completed', paidAt: { gte: from, lte: to }, order: { restaurantId } },
      _sum: { amountCents: true },
      _count: { _all: true },
    });

    return groups.map((group) => ({
      method: group.method,
      amountCents: group._sum.amountCents ?? 0,
      count: group._count._all,
    }));
  }

  private async getPeakHours(restaurantId: string, from: Date, to: Date): Promise<PeakHourEntry[]> {
    // Peak hours reflect when tables actually open (arrival time), not when
    // they're paid — unlike the other queries here, both the filter and the
    // grouping use createdAt so they stay consistent with each other.
    const rows = await this.prisma.$queryRaw<Array<{ hour: number; ordersCount: bigint }>>(Prisma.sql`
      SELECT
        EXTRACT(HOUR FROM "createdAt")::int AS hour,
        COUNT(*)::bigint AS "ordersCount"
      FROM "orders"
      WHERE "restaurantId" = ${restaurantId}
        AND "status" = 'paid'
        AND "createdAt" BETWEEN ${from} AND ${to}
      GROUP BY hour
      ORDER BY hour ASC
    `);

    return rows.map((row) => ({ hour: row.hour, ordersCount: Number(row.ordersCount) }));
  }
}
