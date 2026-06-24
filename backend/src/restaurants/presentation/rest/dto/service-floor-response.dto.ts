import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ServiceFloorView } from '../../../domain/service-floor.models';

class ServiceFloorInfoResponseDto {
  @ApiProperty({ example: 'floor-main' })
  id!: string;

  @ApiProperty({ example: 'Sala principal' })
  name!: string;

  @ApiProperty({ example: 12 })
  rows!: number;

  @ApiProperty({ example: 16 })
  columns!: number;
}

class ServiceFloorElementResponseDto {
  @ApiProperty({ example: 'floor-element-1' })
  id!: string;

  @ApiProperty({ enum: ['table', 'bar', 'kitchen', 'bathroom', 'entrance', 'blocked', 'stool'], example: 'table' })
  type!: ServiceFloorView['elements'][number]['type'];

  @ApiProperty({ example: 'M1' })
  label!: string;

  @ApiProperty({ example: 1 })
  x!: number;

  @ApiProperty({ example: 1 })
  y!: number;

  @ApiProperty({ example: 2 })
  width!: number;

  @ApiProperty({ example: 2 })
  height!: number;

  @ApiPropertyOptional({ enum: ['round', 'square', 'rectangle', 'long'], nullable: true })
  shape!: ServiceFloorView['elements'][number]['shape'];

  @ApiPropertyOptional({ example: 'table-1', nullable: true })
  tableId!: string | null;
}

class ServicePhaseResponseDto {
  @ApiProperty({ enum: ['drinks', 'starters', 'mains', 'desserts', 'mixed', 'none'] })
  course!: ServiceFloorView['servicePoints'][number]['summary']['servicePhase']['course'];

  @ApiProperty({ enum: ['no_order', 'pending', 'in_progress', 'ready', 'served'] })
  status!: ServiceFloorView['servicePoints'][number]['summary']['servicePhase']['status'];
}

class ServicePointTableResponseDto {
  @ApiProperty({ example: 'table-1' })
  id!: string;

  @ApiProperty({ example: 1 })
  tableNumber!: number;

  @ApiPropertyOptional({ example: 'Mesa 1', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 2 })
  capacity!: number;

  @ApiProperty({ enum: ['free', 'occupied', 'waiting_kitchen', 'served', 'payment_pending', 'paid', 'cleaning', 'reserved'] })
  status!: ServiceFloorView['servicePoints'][number]['table']['status'];

  @ApiPropertyOptional({ example: '2026-06-21T12:00:00.000Z', nullable: true })
  serviceStartedAt!: string | null;
}

class ServicePointSummaryResponseDto {
  @ApiProperty({ example: 3 })
  lineCount!: number;

  @ApiProperty({ example: 2 })
  guestCount!: number;

  @ApiProperty({ example: 4250 })
  totalCents!: number;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ type: ServicePhaseResponseDto })
  servicePhase!: ServicePhaseResponseDto;
}

class ServicePointSummaryItemResponseDto {
  @ApiProperty({ type: ServicePointTableResponseDto })
  table!: ServicePointTableResponseDto;

  @ApiProperty({ type: ServicePointSummaryResponseDto })
  summary!: ServicePointSummaryResponseDto;
}

class ServiceFloorTotalsResponseDto {
  @ApiProperty({ example: 7 })
  servicePointCount!: number;

  @ApiProperty({ example: 3 })
  occupiedCount!: number;

  @ApiProperty({ example: 2 })
  openOrderCount!: number;
}

export class ServiceFloorResponseDto {
  @ApiProperty({ example: 'restaurant-mesaflow-centro' })
  restaurantId!: string;

  @ApiProperty({ type: ServiceFloorInfoResponseDto })
  floor!: ServiceFloorInfoResponseDto;

  @ApiProperty({ type: [ServiceFloorElementResponseDto] })
  elements!: ServiceFloorElementResponseDto[];

  @ApiProperty({ type: [ServicePointSummaryItemResponseDto] })
  servicePoints!: ServicePointSummaryItemResponseDto[];

  @ApiProperty({ type: ServiceFloorTotalsResponseDto })
  totals!: ServiceFloorTotalsResponseDto;

  static fromDomain(view: ServiceFloorView): ServiceFloorResponseDto {
    return {
      restaurantId: view.restaurantId,
      floor: { ...view.floor },
      elements: view.elements.map((element) => ({ ...element })),
      servicePoints: view.servicePoints.map((point) => ({
        table: { ...point.table },
        summary: {
          lineCount: point.summary.lineCount,
          guestCount: point.summary.guestCount,
          totalCents: point.summary.totalCents,
          currency: point.summary.currency,
          servicePhase: { ...point.summary.servicePhase },
        },
      })),
      totals: { ...view.totals },
    };
  }
}
