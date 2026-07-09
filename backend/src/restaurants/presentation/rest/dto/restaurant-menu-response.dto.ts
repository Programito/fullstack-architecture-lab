import { ApiProperty } from '@nestjs/swagger';

import type {
  RestaurantMenu,
  RestaurantMenuComboDefinition,
  RestaurantMenuComboSlot,
  RestaurantMenuComboSlotOption,
  RestaurantMenuItem,
  RestaurantMenuModifierGroup,
  RestaurantMenuModifierOption,
  RestaurantMenuPlatterComponent,
  RestaurantMenuSection,
} from '../../../domain/restaurant-read.models';

class RestaurantMenuModifierOptionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() priceDeltaCents!: number;
  @ApiProperty() isAvailable!: boolean;
}

class RestaurantMenuModifierGroupResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['single', 'multiple'] }) selectionType!: 'single' | 'multiple';
  @ApiProperty() minSelections!: number;
  @ApiProperty() maxSelections!: number;
  @ApiProperty() isRequired!: boolean;
  @ApiProperty({ type: [RestaurantMenuModifierOptionResponseDto] }) options!: RestaurantMenuModifierOptionResponseDto[];
}

class RestaurantMenuComboSlotOptionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() restaurantProductId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() supplementPriceCents!: number;
  @ApiProperty() isAvailable!: boolean;
}

class RestaurantMenuComboSlotResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() minSelections!: number;
  @ApiProperty() maxSelections!: number;
  @ApiProperty() isRequired!: boolean;
  @ApiProperty({ type: [RestaurantMenuComboSlotOptionResponseDto] }) options!: RestaurantMenuComboSlotOptionResponseDto[];
}

class RestaurantMenuComboDefinitionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: [RestaurantMenuComboSlotResponseDto] }) slots!: RestaurantMenuComboSlotResponseDto[];
}

class RestaurantMenuPlatterComponentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() removable!: boolean;
  @ApiProperty() replaceable!: boolean;
  @ApiProperty() sortOrder!: number;
}

class RestaurantMenuItemResponseDto {
  @ApiProperty({ example: 'menu-item-burger' }) id!: string;
  @ApiProperty({ example: 'rp-burger-001', required: false }) restaurantProductId?: string;
  @ApiProperty({ example: 'product-burger-001', required: false }) productId?: string;
  @ApiProperty({ example: 'Hamburguesa craft' }) name!: string;
  @ApiProperty({ example: 'Hamburguesa de 200g con queso cheddar', required: false }) description?: string;
  @ApiProperty({ nullable: true, required: false }) imageUrl?: string | null;
  @ApiProperty({ enum: ['simple', 'combo', 'platter'], example: 'simple' }) productType!: RestaurantMenuItem['productType'];
  @ApiProperty({ example: 1250 }) priceCents!: number;
  @ApiProperty({ example: 'EUR' }) currency!: string;
  @ApiProperty({ example: true }) isAvailable!: boolean;
  @ApiProperty({ example: 'main', required: false }) defaultCourse?: string;
  @ApiProperty({ example: 'kitchen', required: false }) preparationRoute?: string;
  @ApiProperty({ type: [String], required: false }) allergens?: string[];
  @ApiProperty({ type: [RestaurantMenuModifierGroupResponseDto] }) modifierGroups!: RestaurantMenuModifierGroupResponseDto[];
  @ApiProperty({ type: RestaurantMenuComboDefinitionResponseDto, nullable: true }) comboDefinition!: RestaurantMenuComboDefinitionResponseDto | null;
  @ApiProperty({ type: [RestaurantMenuPlatterComponentResponseDto] }) platterComponents!: RestaurantMenuPlatterComponentResponseDto[];
}

class RestaurantMenuSectionResponseDto {
  @ApiProperty({ example: 'menu-section-mains' }) id!: string;
  @ApiProperty({ example: 'Principales' }) name!: string;
  @ApiProperty({ example: 2 }) sortOrder!: number;
  @ApiProperty({ example: true }) isVisible!: boolean;
  @ApiProperty({ type: [RestaurantMenuItemResponseDto] }) items!: RestaurantMenuItemResponseDto[];
}

export class RestaurantMenuResponseDto {
  @ApiProperty({ example: 'menu-abc123' }) id!: string;
  @ApiProperty({ example: 'restaurant-mesaflow-centro' }) restaurantId!: string;
  @ApiProperty({ example: 'Carta principal' }) name!: string;
  @ApiProperty({ example: true }) isActive!: boolean;
  @ApiProperty({ type: [RestaurantMenuSectionResponseDto] }) sections!: RestaurantMenuSectionResponseDto[];

  static fromDomain(menu: RestaurantMenu & { id?: string }): RestaurantMenuResponseDto {
    return {
      id: menu.id ?? '',
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
    items: section.items.map(mapItem),
  };
}

function mapItem(item: RestaurantMenuItem): RestaurantMenuItemResponseDto {
  return {
    id: item.id,
    restaurantProductId: item.restaurantProductId,
    productId: item.productId,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    productType: item.productType,
    priceCents: item.priceCents,
    currency: item.currency,
    isAvailable: item.isAvailable,
    defaultCourse: item.defaultCourse,
    preparationRoute: item.preparationRoute,
    allergens: item.allergens ?? [],
    modifierGroups: (item.modifierGroups ?? []).map(mapModifierGroup),
    comboDefinition: item.comboDefinition ? mapComboDefinition(item.comboDefinition) : null,
    platterComponents: (item.platterComponents ?? []).map(mapPlatterComponent),
  };
}

function mapModifierGroup(mg: RestaurantMenuModifierGroup): RestaurantMenuModifierGroupResponseDto {
  return {
    id: mg.id,
    name: mg.name,
    selectionType: mg.selectionType,
    minSelections: mg.minSelections,
    maxSelections: mg.maxSelections,
    isRequired: mg.isRequired,
    options: mg.options.map((opt: RestaurantMenuModifierOption) => ({
      id: opt.id,
      name: opt.name,
      priceDeltaCents: opt.priceDeltaCents,
      isAvailable: opt.isAvailable,
    })),
  };
}

function mapComboDefinition(combo: RestaurantMenuComboDefinition): RestaurantMenuComboDefinitionResponseDto {
  return {
    id: combo.id,
    slots: combo.slots.map((slot: RestaurantMenuComboSlot) => ({
      id: slot.id,
      name: slot.name,
      minSelections: slot.minSelections,
      maxSelections: slot.maxSelections,
      isRequired: slot.isRequired,
      options: slot.options.map((opt: RestaurantMenuComboSlotOption) => ({
        id: opt.id,
        restaurantProductId: opt.restaurantProductId,
        name: opt.name,
        supplementPriceCents: opt.supplementPriceCents,
        isAvailable: opt.isAvailable,
      })),
    })),
  };
}

function mapPlatterComponent(component: RestaurantMenuPlatterComponent): RestaurantMenuPlatterComponentResponseDto {
  return {
    id: component.id,
    name: component.name,
    removable: component.removable,
    replaceable: component.replaceable,
    sortOrder: component.sortOrder,
  };
}
