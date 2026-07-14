import type { ServiceWindow, UpdateServiceWindowInput } from '../../domain/restaurant-read.models';

export const RESTAURANT_SERVICE_WINDOWS_REPOSITORY = Symbol('RESTAURANT_SERVICE_WINDOWS_REPOSITORY');

export interface RestaurantServiceWindowsRepository {
  findServiceWindowsByRestaurantId(restaurantId: string): Promise<ServiceWindow[] | null>;
  updateServiceWindows(restaurantId: string, windows: UpdateServiceWindowInput[]): Promise<ServiceWindow[] | null>;
}
