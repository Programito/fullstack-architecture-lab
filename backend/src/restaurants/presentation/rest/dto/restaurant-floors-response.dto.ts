import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { FloorElementView, RestaurantFloorView, RestaurantFloors, RestaurantTableView } from '../../../domain/restaurant-read.models';

class RestaurantTableResponseDto {
  @ApiProperty({ example: 'table-1' })
  id!: string;

  @ApiProperty({ example: 1 })
  tableNumber!: number;

  @ApiPropertyOptional({ example: 'Mesa 1', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 2 })
  capacity!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

class FloorElementResponseDto {
  @ApiProperty({ example: 'floor-element-1' })
  id!: string;

  @ApiProperty({ enum: ['table', 'bar', 'kitchen', 'bathroom', 'entrance', 'blocked', 'stool'], example: 'table' })
  type!: FloorElementView['type'];

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

  @ApiPropertyOptional({ example: 'table-1', nullable: true })
  tableId!: string | null;

  @ApiPropertyOptional({ enum: ['round', 'square', 'rectangle', 'long'], nullable: true })
  shape!: FloorElementView['shape'];

  @ApiProperty({ example: 1 })
  sortOrder!: number;
}

class RestaurantFloorResponseDto {
  @ApiProperty({ example: 'floor-main' })
  id!: string;

  @ApiProperty({ example: 'Sala principal' })
  name!: string;

  @ApiProperty({ example: 12 })
  rows!: number;

  @ApiProperty({ example: 16 })
  columns!: number;

  @ApiProperty({ type: [FloorElementResponseDto] })
  elements!: FloorElementResponseDto[];
}

export class RestaurantFloorsResponseDto {
  @ApiProperty({ example: 'restaurant-mesaflow-centro' })
  restaurantId!: string;

  @ApiProperty({ type: [RestaurantTableResponseDto] })
  tables!: RestaurantTableResponseDto[];

  @ApiProperty({ type: [RestaurantFloorResponseDto] })
  floors!: RestaurantFloorResponseDto[];

  static fromDomain(floors: RestaurantFloors): RestaurantFloorsResponseDto {
    return {
      restaurantId: floors.restaurantId,
      tables: floors.tables.map(mapTable),
      floors: floors.floors.map(mapFloor),
    };
  }
}

function mapTable(table: RestaurantTableView): RestaurantTableResponseDto {
  return { ...table };
}

function mapFloor(floor: RestaurantFloorView): RestaurantFloorResponseDto {
  return {
    id: floor.id,
    name: floor.name,
    rows: floor.rows,
    columns: floor.columns,
    elements: floor.elements.map((element) => ({ ...element })),
  };
}
