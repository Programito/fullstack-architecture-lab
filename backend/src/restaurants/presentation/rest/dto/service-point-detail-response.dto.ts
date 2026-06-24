import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ServicePointDetailView } from '../../../domain/service-floor.models';

class ServicePointDetailTableResponseDto {
  @ApiProperty({ example: 'table-1' })
  id!: string;

  @ApiProperty({ example: 1 })
  tableNumber!: number;

  @ApiPropertyOptional({ example: 'Mesa 1', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 2 })
  capacity!: number;

  @ApiProperty({ enum: ['free', 'occupied', 'waiting_kitchen', 'served', 'payment_pending', 'paid', 'cleaning', 'reserved'] })
  status!: ServicePointDetailView['table']['status'];

  @ApiPropertyOptional({ example: '2026-06-21T12:00:00.000Z', nullable: true })
  occupiedAt!: string | null;

  @ApiPropertyOptional({ example: '2026-06-21T12:00:00.000Z', nullable: true })
  serviceStartedAt!: string | null;
}

class ServicePointDetailFloorElementResponseDto {
  @ApiProperty({ example: 'floor-element-1' })
  id!: string;

  @ApiProperty({ example: 'M1' })
  label!: string;

  @ApiProperty({ enum: ['table', 'bar', 'kitchen', 'bathroom', 'entrance', 'blocked', 'stool'] })
  type!: NonNullable<ServicePointDetailView['floorElement']>['type'];

  @ApiProperty({ example: 1 })
  x!: number;

  @ApiProperty({ example: 1 })
  y!: number;

  @ApiProperty({ example: 2 })
  width!: number;

  @ApiProperty({ example: 2 })
  height!: number;

  @ApiPropertyOptional({ enum: ['round', 'square', 'rectangle', 'long'], nullable: true })
  shape!: NonNullable<ServicePointDetailView['floorElement']>['shape'];
}

class ServicePointDetailPhaseResponseDto {
  @ApiProperty({ enum: ['drinks', 'starters', 'mains', 'desserts', 'mixed', 'none'] })
  course!: ServicePointDetailView['serviceInfo']['servicePhase']['course'];

  @ApiProperty({ enum: ['no_order', 'pending', 'in_progress', 'ready', 'served'] })
  status!: ServicePointDetailView['serviceInfo']['servicePhase']['status'];
}

class ServicePointDetailInfoResponseDto {
  @ApiProperty({ example: 2 })
  guestCount!: number;

  @ApiProperty({ example: 3 })
  lineCount!: number;

  @ApiProperty({ example: 4250 })
  totalCents!: number;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ type: ServicePointDetailPhaseResponseDto })
  servicePhase!: ServicePointDetailPhaseResponseDto;

  @ApiProperty({ example: 34 })
  durationMinutes!: number;
}

export class ServicePointDetailResponseDto {
  @ApiProperty({ type: ServicePointDetailTableResponseDto })
  table!: ServicePointDetailTableResponseDto;

  @ApiPropertyOptional({ type: ServicePointDetailFloorElementResponseDto, nullable: true })
  floorElement!: ServicePointDetailFloorElementResponseDto | null;

  @ApiProperty({ type: ServicePointDetailInfoResponseDto })
  serviceInfo!: ServicePointDetailInfoResponseDto;

  static fromDomain(view: ServicePointDetailView): ServicePointDetailResponseDto {
    return {
      table: { ...view.table },
      floorElement: view.floorElement ? { ...view.floorElement } : null,
      serviceInfo: {
        guestCount: view.serviceInfo.guestCount,
        lineCount: view.serviceInfo.lineCount,
        totalCents: view.serviceInfo.totalCents,
        currency: view.serviceInfo.currency,
        servicePhase: { ...view.serviceInfo.servicePhase },
        durationMinutes: view.serviceInfo.durationMinutes,
      },
    };
  }
}
