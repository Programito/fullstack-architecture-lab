import { ApiProperty } from '@nestjs/swagger';

import type { RestaurantMenu, RestaurantMenuItem, RestaurantMenuSection } from '../../../domain/restaurant-read.models';

class RestaurantMenuItemResponseDto {
  @ApiProperty({ example: 'menu-item-burger' })
  id!: string;

  @ApiProperty({ example: 'Hamburguesa craft' })
  name!: string;

  @ApiProperty({ enum: ['simple', 'combo', 'platter'], example: 'simple' })
  productType!: RestaurantMenuItem['productType'];

  @ApiProperty({ example: 1250 })
  priceCents!: number;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: true })
  isAvailable!: boolean;
}

class RestaurantMenuSectionResponseDto {
  @ApiProperty({ example: 'menu-section-mains' })
  id!: string;

  @ApiProperty({ example: 'Principales' })
  name!: string;

  @ApiProperty({ example: 2 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isVisible!: boolean;

  @ApiProperty({ type: [RestaurantMenuItemResponseDto] })
  items!: RestaurantMenuItemResponseDto[];
}

export class RestaurantMenuResponseDto {
  @ApiProperty({ example: 'restaurant-mesaflow-centro' })
  restaurantId!: string;

  @ApiProperty({ example: 'Carta principal' })
  name!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: [RestaurantMenuSectionResponseDto] })
  sections!: RestaurantMenuSectionResponseDto[];

  static fromDomain(menu: RestaurantMenu): RestaurantMenuResponseDto {
    return {
      restaurantId: menu.restaurantId,
      name: menu.name,
      isActive: menu.isActive,
      sections: menu.sections.map(mapSection),
    };
  }
}

function mapSection(section: RestaurantMenuSection): RestaurantMenuSectionResponseDto {
  return {
    id: section.id,
    name: section.name,
    sortOrder: section.sortOrder,
    isVisible: section.isVisible,
    items: section.items.map((item) => ({ ...item })),
  };
}
