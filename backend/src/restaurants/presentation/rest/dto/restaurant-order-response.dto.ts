import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type {
  RestaurantOrderComboSlotView,
  RestaurantOrderLineView,
  RestaurantOrderModifierView,
  RestaurantOrderPaymentView,
  RestaurantOrderPlatterComponentView,
  RestaurantOrderView,
} from '../../../domain/restaurant-order.models';

export class RestaurantOrderModifierResponseDto {
  @ApiProperty() groupName!: string;
  @ApiProperty() optionName!: string;
  @ApiProperty() priceDeltaCents!: number;
  @ApiProperty() quantity!: number;

  static fromDomain(m: RestaurantOrderModifierView): RestaurantOrderModifierResponseDto {
    return Object.assign(new RestaurantOrderModifierResponseDto(), {
      groupName: m.groupName,
      optionName: m.optionName,
      priceDeltaCents: m.priceDeltaCents,
      quantity: m.quantity,
    });
  }
}

export class RestaurantOrderComboSlotResponseDto {
  @ApiProperty() slotName!: string;
  @ApiProperty() selectedProductName!: string;
  @ApiProperty() supplementPriceCents!: number;
  @ApiProperty() quantity!: number;

  static fromDomain(s: RestaurantOrderComboSlotView): RestaurantOrderComboSlotResponseDto {
    return Object.assign(new RestaurantOrderComboSlotResponseDto(), {
      slotName: s.slotName,
      selectedProductName: s.selectedProductName,
      supplementPriceCents: s.supplementPriceCents,
      quantity: s.quantity,
    });
  }
}

export class RestaurantOrderPlatterComponentResponseDto {
  @ApiProperty() componentName!: string;
  @ApiProperty() removed!: boolean;
  @ApiPropertyOptional({ nullable: true }) replacementName!: string | null;
  @ApiProperty() priceDeltaCents!: number;

  static fromDomain(c: RestaurantOrderPlatterComponentView): RestaurantOrderPlatterComponentResponseDto {
    return Object.assign(new RestaurantOrderPlatterComponentResponseDto(), {
      componentName: c.componentName,
      removed: c.removed,
      replacementName: c.replacementName,
      priceDeltaCents: c.priceDeltaCents,
    });
  }
}

export class RestaurantOrderLineResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) restaurantProductId!: string | null;
  @ApiPropertyOptional({ nullable: true }) productId!: string | null;
  @ApiProperty() productName!: string;
  @ApiProperty() productType!: string;
  @ApiProperty() course!: string;
  @ApiProperty() preparationRoute!: string;
  @ApiProperty() basePriceCents!: number;
  @ApiProperty() unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() subtotalCents!: number;
  @ApiPropertyOptional({ nullable: true }) taxRateName!: string | null;
  @ApiPropertyOptional({ nullable: true }) taxRatePercent!: number | null;
  @ApiProperty() taxCents!: number;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ nullable: true }) kitchenNote!: string | null;
  @ApiPropertyOptional({ nullable: true }) cancellationReason!: string | null;
  @ApiPropertyOptional({ nullable: true }) cancelledAt!: string | null;
  @ApiProperty() configurationSignature!: string;
  @ApiProperty({ type: () => RestaurantOrderModifierResponseDto, isArray: true }) modifiers!: RestaurantOrderModifierResponseDto[];
  @ApiProperty({ type: () => RestaurantOrderComboSlotResponseDto, isArray: true }) comboSlots!: RestaurantOrderComboSlotResponseDto[];
  @ApiProperty({ type: () => RestaurantOrderPlatterComponentResponseDto, isArray: true }) platterComponents!: RestaurantOrderPlatterComponentResponseDto[];

  static fromDomain(line: RestaurantOrderLineView): RestaurantOrderLineResponseDto {
    return Object.assign(new RestaurantOrderLineResponseDto(), {
      id: line.id,
      restaurantProductId: line.restaurantProductId,
      productId: line.productId,
      productName: line.productName,
      productType: line.productType,
      course: line.course,
      preparationRoute: line.preparationRoute,
      basePriceCents: line.basePriceCents,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      subtotalCents: line.subtotalCents,
      taxRateName: line.taxRateName,
      taxRatePercent: line.taxRatePercent,
      taxCents: line.taxCents,
      status: line.status,
      kitchenNote: line.kitchenNote,
      cancellationReason: line.cancellationReason,
      cancelledAt: line.cancelledAt,
      configurationSignature: line.configurationSignature,
      modifiers: line.modifiers.map(RestaurantOrderModifierResponseDto.fromDomain),
      comboSlots: line.comboSlots.map(RestaurantOrderComboSlotResponseDto.fromDomain),
      platterComponents: line.platterComponents.map(RestaurantOrderPlatterComponentResponseDto.fromDomain),
    });
  }
}

export class RestaurantOrderPaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() method!: string;
  @ApiProperty() amountCents!: number;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ nullable: true }) paidAt!: string | null;

  static fromDomain(p: RestaurantOrderPaymentView): RestaurantOrderPaymentResponseDto {
    return Object.assign(new RestaurantOrderPaymentResponseDto(), {
      id: p.id,
      method: p.method,
      amountCents: p.amountCents,
      status: p.status,
      paidAt: p.paidAt,
    });
  }
}

export class RestaurantOrderSummaryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Numero de ticket visible al cliente: contador diario por restaurante.' })
  dailyNumber!: number;
  @ApiProperty() restaurantId!: string;
  @ApiPropertyOptional({ nullable: true }) tableId!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() guestCount!: number;
  @ApiProperty() subtotalCents!: number;
  @ApiProperty() taxCents!: number;
  @ApiProperty() discountTotalCents!: number;
  @ApiProperty() totalCents!: number;
  @ApiProperty() paidCents!: number;
  @ApiProperty() balanceCents!: number;
  @ApiProperty() openedAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ nullable: true }) closedAt!: string | null;
  @ApiPropertyOptional({ nullable: true, description: "Origen del cliente que abrio el pedido (p. ej. 'web-pos' o 'apk-customer'); null en pedidos antiguos." })
  clientOrigin?: string | null;
}

export class RestaurantOrderResponseDto {
  @ApiProperty({ type: () => RestaurantOrderSummaryResponseDto }) order!: RestaurantOrderSummaryResponseDto;
  @ApiProperty({ type: () => RestaurantOrderLineResponseDto, isArray: true }) lines!: RestaurantOrderLineResponseDto[];
  @ApiProperty({ type: () => RestaurantOrderPaymentResponseDto, isArray: true }) payments!: RestaurantOrderPaymentResponseDto[];

  static fromDomain(view: RestaurantOrderView): RestaurantOrderResponseDto {
    return Object.assign(new RestaurantOrderResponseDto(), {
      order: Object.assign(new RestaurantOrderSummaryResponseDto(), view.order),
      lines: view.lines.map(RestaurantOrderLineResponseDto.fromDomain),
      payments: view.payments.map(RestaurantOrderPaymentResponseDto.fromDomain),
    });
  }
}
