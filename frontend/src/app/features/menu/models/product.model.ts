import type { OrderCourse } from '../../restaurant-pos/models/order.models';

export type ProductType = 'simple' | 'combo';

export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  basePrice: number;
  available: boolean;
  allergens?: string[];
  course: OrderCourse;
  type: ProductType;
  modifierGroupIds: string[];
  category?: string;
  price?: number;
}

