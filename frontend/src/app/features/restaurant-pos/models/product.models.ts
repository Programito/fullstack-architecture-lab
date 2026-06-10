export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  allergens?: string[];
}
