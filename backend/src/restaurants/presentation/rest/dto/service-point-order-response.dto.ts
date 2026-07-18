import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ServicePointOrderLineView, ServicePointOrderView } from '../../../domain/service-floor.models';

class ServicePointOrderModifierResponseDto {
  @ApiProperty() groupName!: string;
  @ApiProperty() optionName!: string;
  @ApiProperty() priceDeltaCents!: number;
  @ApiProperty() quantity!: number;
}

class ServicePointOrderComboSlotResponseDto {
  @ApiProperty() slotName!: string;
  @ApiProperty() selectedProductName!: string;
  @ApiProperty() supplementPriceCents!: number;
  @ApiProperty() quantity!: number;
}

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

  @ApiPropertyOptional({ nullable: true, example: 'apk-customer', description: "Origen del cliente que abrio el pedido; null en pedidos antiguos." })
  clientOrigin?: string | null;
}

class ServicePointOrderLineResponseDto {
  @ApiProperty({ example: 'line-burger' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, example: 'rp-burger-001' })
  restaurantProductId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'product-burger-001' })
  productId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.test/wine.jpg' })
  imageUrl!: string | null;

  @ApiProperty({ example: 'rp-burger|' })
  configurationSignature!: string;

  @ApiProperty({ example: 'Hamburguesa craft' })
  productName!: string;

  @ApiProperty({ enum: ['simple', 'combo', 'platter'] })
  productType!: ServicePointOrderLineView['productType'];

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 1350 })
  unitPriceCents!: number;

  @ApiProperty({ example: 1350 })
  subtotalCents!: number;

  @ApiPropertyOptional({ example: 'IVA General', nullable: true })
  taxRateName!: string | null;

  @ApiPropertyOptional({ example: 21, nullable: true })
  taxRatePercent!: number | null;

  @ApiProperty({ example: 234 })
  taxCents!: number;

  @ApiProperty({ enum: ['pending', 'sent_to_kitchen', 'preparing', 'ready', 'picked_up', 'served', 'cancelled'] })
  status!: ServicePointOrderLineView['status'];

  @ApiProperty({ enum: ['drinks', 'starters', 'mains', 'desserts', 'mixed', 'none'] })
  course!: ServicePointOrderLineView['course'];

  @ApiProperty({ enum: ['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'] })
  preparationRoute!: ServicePointOrderLineView['preparationRoute'];

  @ApiPropertyOptional({ example: 'Sin cebolla', nullable: true })
  kitchenNote!: string | null;

  @ApiProperty({ example: '2026-06-21T12:20:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: [ServicePointOrderModifierResponseDto] })
  modifiers!: ServicePointOrderModifierResponseDto[];

  @ApiProperty({ type: [ServicePointOrderComboSlotResponseDto] })
  comboSlots!: ServicePointOrderComboSlotResponseDto[];
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
