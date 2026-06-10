export type TableStatus = 'free' | 'occupied' | 'waiting_kitchen' | 'served' | 'payment_pending' | 'paid' | 'cleaning' | 'reserved';

export interface RestaurantTable {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  total: number;
  openDuration: string;
  occupiedAt?: string;
  serviceStartedAt?: string;
  cleaningStartedAt?: string;
}
