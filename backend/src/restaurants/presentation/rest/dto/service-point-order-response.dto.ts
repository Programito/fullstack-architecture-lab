import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ServicePointOrderView } from '../../../domain/service-floor.models';

class ServicePointOrderInfoResponseDto {
  @ApiProperty({ example: 'order-demo-service' })
  id!: string;

  @ApiProperty({ example: 'table-3' })
  tableId!: string;

  @ApiProperty({ enum: ['open', 'sent_to_kitchen', 'served', 'payment_pending', 'paid'] })
  status!: NonNullable<ServicePointOrderView['order']>['status'];

  @ApiProperty({ example: '2026-06-21T12:00:00.000Z' })
  openedAt!: string;

  @ApiProperty({ example: '2026-06-21T12:25:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ example: 2940 })
  subtotalCents!: number;

  @ApiProperty({ example: 0 })
  taxCents!: number;

  @ApiProperty({ example: 2940 })
  totalCents!: number;

  @ApiProperty({ example: 'EUR' })
  currency!: string;
}

class ServicePointOrderLineResponseDto {
  @ApiProperty({ example: 'line-burger' })
  id!: string;

  @ApiProperty({ example: 'Hamburguesa craft' })
  productName!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 1350 })
  unitPriceCents!: number;

  @ApiProperty({ example: 1350 })
  subtotalCents!: number;

  @ApiProperty({ enum: ['pending', 'sent_to_kitchen', 'preparing', 'ready', 'picked_up', 'served', 'cancelled'] })
  status!: ServicePointOrderView['lines'][number]['status'];

  @ApiProperty({ enum: ['drinks', 'starters', 'mains', 'desserts', 'mixed', 'none'] })
  course!: ServicePointOrderView['lines'][number]['course'];

  @ApiPropertyOptional({ example: 'Sin cebolla', nullable: true })
  kitchenNote!: string | null;

  @ApiProperty({ example: '2026-06-21T12:20:00.000Z' })
  updatedAt!: string;
}

export class ServicePointOrderResponseDto {
  @ApiPropertyOptional({ type: ServicePointOrderInfoResponseDto, nullable: true })
  order!: ServicePointOrderInfoResponseDto | null;

  @ApiProperty({ type: [ServicePointOrderLineResponseDto] })
  lines!: ServicePointOrderLineResponseDto[];

  static fromDomain(view: ServicePointOrderView): ServicePointOrderResponseDto {
    return {
      order: view.order ? { ...view.order } : null,
      lines: view.lines.map((line) => ({ ...line })),
    };
  }
}
