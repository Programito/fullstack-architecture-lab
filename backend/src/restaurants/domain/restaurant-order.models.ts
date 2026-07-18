export type OrderStatus = 'open' | 'pending_payment' | 'paid' | 'cancelled';
export type OrderLineStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'bizum' | 'other';

export type OpenRestaurantOrderCommand = {
  restaurantId: string;
  tableId: string;
  openedByUserId: string;
  guestCount: number;
  /** Origen del cliente que abre el pedido (header X-Client-Origin), p. ej. 'web-pos' o 'apk-customer'. */
  clientOrigin?: string | null;
};

export type AddOrderLineCommand = {
  restaurantId: string;
  orderId: string;
  restaurantProductId: string;
  quantity: number;
  kitchenNote: string | null;
  modifiers: Array<{ modifierGroupId: string; modifierOptionId: string; quantity: number }>;
  comboSlots: Array<{ comboSlotId: string; restaurantProductId: string; quantity: number }>;
  platterComponents: Array<{ platterComponentId: string; included: boolean }>;
};

export type UpdateOrderLineCommand = {
  restaurantId: string;
  orderId: string;
  lineId: string;
  quantity?: number;
  kitchenNote?: string | null;
};

export type DeleteOrderLineCommand = {
  restaurantId: string;
  orderId: string;
  lineId: string;
};

export type CancelOrderLineCommand = DeleteOrderLineCommand & {
  reason: string;
};

export type KitchenOrderLineStatus = 'sent_to_kitchen' | 'preparing' | 'ready' | 'served';

export type UpdateOrderLineStatusCommand = {
  restaurantId: string;
  orderId: string;
  lineId: string;
  status: KitchenOrderLineStatus;
};

export type RegisterOrderPaymentCommand = {
  restaurantId: string;
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
};

export type RestaurantOrderModifierView = {
  groupName: string;
  optionName: string;
  priceDeltaCents: number;
  quantity: number;
};

export type RestaurantOrderComboSlotView = {
  slotName: string;
  selectedProductName: string;
  supplementPriceCents: number;
  quantity: number;
};

export type RestaurantOrderPlatterComponentView = {
  componentName: string;
  removed: boolean;
  replacementName: string | null;
  priceDeltaCents: number;
};

export type RestaurantOrderLineView = {
  id: string;
  restaurantProductId: string | null;
  productId: string | null;
  imageUrl: string | null;
  productName: string;
  productType: 'simple' | 'combo' | 'platter';
  course: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  basePriceCents: number;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  taxRateName: string | null;
  taxRatePercent: number | null;
  taxCents: number;
  // 'sent_to_kitchen' es un estado de la capa de vista: en BD la linea sigue
  // en 'pending' con sentToKitchenAt marcado hasta que cocina la empieza.
  status: OrderLineStatus | 'sent_to_kitchen';
  kitchenNote: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  configurationSignature: string;
  modifiers: RestaurantOrderModifierView[];
  comboSlots: RestaurantOrderComboSlotView[];
  platterComponents: RestaurantOrderPlatterComponentView[];
};

export type RestaurantOrderPaymentView = {
  id: string;
  method: PaymentMethod;
  amountCents: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt: string | null;
};

export type RestaurantOrderView = {
  order: {
    id: string;
    /** Numero de ticket visible al cliente: contador diario por restaurante, no unico a nivel de fila. */
    dailyNumber: number;
    restaurantId: string;
    tableId: string | null;
    status: OrderStatus;
    currency: string;
    guestCount: number;
    subtotalCents: number;
    taxCents: number;
    discountTotalCents: number;
    totalCents: number;
    paidCents: number;
    balanceCents: number;
    openedAt: string;
    updatedAt: string;
    closedAt: string | null;
    /** Origen del cliente que abrio el pedido; null en pedidos antiguos. */
    clientOrigin?: string | null;
  };
  lines: RestaurantOrderLineView[];
  payments: RestaurantOrderPaymentView[];
};
