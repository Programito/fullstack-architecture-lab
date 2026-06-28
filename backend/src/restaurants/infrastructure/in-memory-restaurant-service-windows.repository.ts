import type { RestaurantServiceWindowsRepository } from '../application/ports/restaurant-service-windows-repository.port';
import type { ServiceWindow, UpdateServiceWindowInput } from '../domain/restaurant-read.models';

export class InMemoryRestaurantServiceWindowsRepository implements RestaurantServiceWindowsRepository {
  private windows: Map<string, ServiceWindow[]> = new Map();
  private nextId = 1;

  seed(restaurantId: string, windows: ServiceWindow[]): void {
    this.windows.set(restaurantId, windows);
  }

  async findServiceWindowsByRestaurantId(restaurantId: string): Promise<ServiceWindow[] | null> {
    return this.windows.get(restaurantId) ?? null;
  }

  async updateServiceWindows(restaurantId: string, inputs: UpdateServiceWindowInput[]): Promise<ServiceWindow[] | null> {
    if (!this.windows.has(restaurantId)) return null;

    const updated: ServiceWindow[] = inputs.map((w, index) => ({
      id: `sw-${this.nextId++}`,
      restaurantId,
      name: w.name,
      startTime: w.startTime,
      endTime: w.endTime,
      sortOrder: index,
    }));

    this.windows.set(restaurantId, updated);
    return updated;
  }
}
