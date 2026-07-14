import { describe, expect, it, vi } from 'vitest';

import { invalidServiceWindows, restaurantNotFound } from '../../../shared/errors/application-error';
import type { RestaurantServiceWindowsRepository } from '../ports/restaurant-service-windows-repository.port';
import { UpdateRestaurantServiceWindowsUseCase } from './update-restaurant-service-windows.use-case';

function makeRepository(): RestaurantServiceWindowsRepository {
  return {
    findServiceWindowsByRestaurantId: vi.fn(),
    updateServiceWindows: vi.fn(),
  };
}

const RESTAURANT_ID = 'r-1';

const validWindows = [
  { name: 'Comidas', startTime: '12:00', endTime: '16:30' },
  { name: 'Cenas', startTime: '20:00', endTime: '23:30' },
];

const updatedWindows = [
  { id: 'sw-1', restaurantId: RESTAURANT_ID, name: 'Comidas', startTime: '12:00', endTime: '16:30', sortOrder: 1 },
  { id: 'sw-2', restaurantId: RESTAURANT_ID, name: 'Cenas', startTime: '20:00', endTime: '23:30', sortOrder: 2 },
];

describe('UpdateRestaurantServiceWindowsUseCase', () => {
  it('updates and returns the service windows', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateServiceWindows).mockResolvedValue(updatedWindows);
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute({ restaurantId: RESTAURANT_ID, windows: validWindows });

    expect(result).toEqual({ ok: true, value: updatedWindows });
    expect(repository.updateServiceWindows).toHaveBeenCalledWith(RESTAURANT_ID, validWindows);
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateServiceWindows).mockResolvedValue(null);
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'missing', windows: validWindows });

    expect(result).toEqual({ ok: false, error: restaurantNotFound('missing') });
  });

  it('rejects an empty windows array', async () => {
    const repository = makeRepository();
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute({ restaurantId: RESTAURANT_ID, windows: [] });

    expect(result).toEqual({ ok: false, error: invalidServiceWindows('at_least_one_window_required') });
    expect(repository.updateServiceWindows).not.toHaveBeenCalled();
  });

  it('rejects more than 5 windows', async () => {
    const repository = makeRepository();
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);
    const tooMany = Array.from({ length: 6 }, (_, i) => ({
      name: `Servicio ${i + 1}`,
      startTime: '10:00',
      endTime: '12:00',
    }));

    const result = await useCase.execute({ restaurantId: RESTAURANT_ID, windows: tooMany });

    expect(result).toEqual({ ok: false, error: invalidServiceWindows('too_many_windows') });
  });

  it('rejects a window with an empty name', async () => {
    const repository = makeRepository();
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      windows: [{ name: '  ', startTime: '12:00', endTime: '16:30' }],
    });

    expect(result).toEqual({ ok: false, error: invalidServiceWindows('empty_name') });
  });

  it('rejects a window where startTime is not before endTime', async () => {
    const repository = makeRepository();
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      windows: [{ name: 'Comidas', startTime: '16:30', endTime: '12:00' }],
    });

    expect(result).toEqual({ ok: false, error: invalidServiceWindows('start_must_be_before_end') });
  });

  it('rejects a window where startTime equals endTime', async () => {
    const repository = makeRepository();
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      windows: [{ name: 'Comidas', startTime: '12:00', endTime: '12:00' }],
    });

    expect(result).toEqual({ ok: false, error: invalidServiceWindows('start_must_be_before_end') });
  });

  it('rejects a window with an invalid time format', async () => {
    const repository = makeRepository();
    const useCase = new UpdateRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      windows: [{ name: 'Comidas', startTime: '25:00', endTime: '26:00' }],
    });

    expect(result).toEqual({ ok: false, error: invalidServiceWindows('invalid_time_format') });
  });
});
