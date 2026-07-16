import { describe, expect, it, vi } from 'vitest';

import { invalidReservationCreation, invalidReservationState, restaurantNotFound } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { FakeReservationPaymentGateway } from '../../infrastructure/fake-reservation-payment.gateway';
import { RESERVATION_DEPOSIT_PER_PERSON_CENTS } from '../../domain/reservation-pricing';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import type { ReservationPaymentGateway } from '../ports/reservation-payment-gateway.port';
import type { RestaurantServiceWindowsRepository } from '../ports/restaurant-service-windows-repository.port';
import type { RestaurantReservation, ServiceWindow, UpdateServiceWindowInput } from '../../domain/restaurant-read.models';
import { CreateRestaurantReservationUseCase } from './create-restaurant-reservation.use-case';

class InMemoryReservationReadRepository implements Partial<RestaurantReadRepository> {
  private reservations: RestaurantReservation[] = [];
  private tableCapacities: Map<string, number> = new Map();
  private restaurantExists = true;

  seed(reservations: RestaurantReservation[], tableCapacities: Map<string, number> = new Map(), restaurantExists = true): void {
    this.reservations = reservations;
    this.tableCapacities = tableCapacities;
    this.restaurantExists = restaurantExists;
  }

  async listRestaurants(): Promise<[]> { return []; }
  async findMenuByRestaurantId(): Promise<null> { return null; }
  async findFloorsByRestaurantId(): Promise<null> { return null; }
  async listReservationsByRestaurantId(): Promise<[]> { return []; }
  async findReservationById(): Promise<null> { return null; }

  async findConflictingReservations(_restaurantId: string, tableId: string, startTime: Date, endTime: Date): Promise<string[]> {
    return this.reservations
      .filter((r) => {
        if (r.status === 'cancelled' || r.status === 'no_show') return false;
        if (!r.tableIds.includes(tableId)) return false;
        const rStart = new Date(r.reservationAt);
        const rEnd = new Date(rStart.getTime() + r.durationMinutes * 60 * 1000);
        return rStart < endTime && rEnd > startTime;
      })
      .map((r) => r.id);
  }

  async findTableCapacity(_restaurantId: string, tableId: string): Promise<number | null> {
    return this.tableCapacities.get(tableId) ?? null;
  }

  async createReservation(
    _restaurantId: string,
    input: {
      customerNameSnapshot: string;
      partySize: number;
      reservationAt: string;
      durationMinutes: number;
      notes: string | null;
      tableIds: string[];
      customerPhoneSnapshot: string | null;
      depositAmountCents: number;
      depositPaidAt: string | null;
    },
  ): Promise<RestaurantReservation | null> {
    if (!this.restaurantExists) return null;
    const reservation: RestaurantReservation = {
      id: `res-${Date.now()}`,
      customerId: null,
      customerNameSnapshot: input.customerNameSnapshot,
      customerPhoneSnapshot: input.customerPhoneSnapshot,
      partySize: input.partySize,
      reservationAt: input.reservationAt,
      durationMinutes: input.durationMinutes,
      status: 'pending',
      notes: input.notes,
      tableIds: input.tableIds,
      tables: [],
      depositAmountCents: input.depositAmountCents,
      depositPaidAt: input.depositPaidAt,
    };
    this.reservations.push(reservation);
    return reservation;
  }

  async updateReservationStatus(): Promise<null> { return null; }
  async findServiceFloorByRestaurantId(): Promise<null> { return null; }
  async findServicePointByRestaurantId(): Promise<null> { return null; }
  async findServicePointOrderByRestaurantId(): Promise<null> { return null; }
  async occupyServicePoint(): Promise<null> { return null; }
  async sendServicePointOrderToKitchen(): Promise<null> { return null; }
  async markServicePointOrderServed(): Promise<null> { return null; }
  async chargeServicePoint(): Promise<null> { return null; }
  async setServicePointStatus(): Promise<null> { return null; }
  async reorderFloorElements(): Promise<null> { return null; }
  async updateFloor(): Promise<null> { return null; }
  async updateFloorElement(): Promise<null> { return null; }
  async createFloorElement(): Promise<null> { return null; }
  async updateServiceOrderLineStatus(): Promise<null> { return null; }
}

class InMemoryServiceWindowsRepository implements RestaurantServiceWindowsRepository {
  private windows: ServiceWindow[] | null = null;

  seed(windows: ServiceWindow[] | null): void {
    this.windows = windows;
  }

  async findServiceWindowsByRestaurantId(_restaurantId: string): Promise<ServiceWindow[] | null> {
    return this.windows;
  }

  async updateServiceWindows(_restaurantId: string, inputs: UpdateServiceWindowInput[]): Promise<ServiceWindow[]> {
    this.windows = inputs.map((w, i) => ({ id: `sw-${i}`, restaurantId: 'r1', name: w.name, startTime: w.startTime, endTime: w.endTime, sortOrder: i }));
    return this.windows;
  }
}

function makeUseCase(
  readRepo: InMemoryReservationReadRepository,
  serviceWindowsRepo: InMemoryServiceWindowsRepository,
  paymentGateway: ReservationPaymentGateway = new FakeReservationPaymentGateway(),
) {
  return new CreateRestaurantReservationUseCase(
    readRepo as unknown as RestaurantReadRepository,
    serviceWindowsRepo,
    paymentGateway,
  );
}

const FUTURE_ISO = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
const PAST_ISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe('CreateRestaurantReservationUseCase', () => {
  it('validates input: empty customer name', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);
    const useCase = makeUseCase(readRepo, windowsRepo);

    const result = await useCase.execute({
      restaurantId: 'r1',
      customerNameSnapshot: '  ',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: FUTURE_ISO,
      durationMinutes: 90,
      notes: null,
      tableIds: [],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_reservation_creation');
  });

  it('rejects reservations in the past', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'Carlos',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: PAST_ISO,
      durationMinutes: 90,
      notes: null,
      tableIds: [],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('reservation_in_past');
  });

  it('rejects when table capacity is insufficient', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    readRepo.seed([], new Map([['table-1', 2]]));
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'Laura',
      customerPhoneSnapshot: null,
      partySize: 5,
      reservationAt: FUTURE_ISO,
      durationMinutes: 90,
      notes: null,
      tableIds: ['table-1'],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('insufficient_table_capacity');
  });

  it('rejects when there is a conflicting reservation on the same table', async () => {
    const conflictingRes: RestaurantReservation = {
      id: 'existing-res',
      customerId: null,
      customerNameSnapshot: 'Existing Guest',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: FUTURE_ISO,
      durationMinutes: 120,
      status: 'confirmed',
      notes: null,
      tableIds: ['table-1'],
      tables: [],
      depositAmountCents: 1000,
      depositPaidAt: '2026-01-01T00:00:00.000Z',
    };
    const readRepo = new InMemoryReservationReadRepository();
    readRepo.seed([conflictingRes]);
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'New Guest',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: FUTURE_ISO,
      durationMinutes: 90,
      notes: null,
      tableIds: ['table-1'],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('reservation_conflict');
  });

  it('rejects when reservation falls outside all service windows', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed([{ id: 'sw-1', restaurantId: 'r1', name: 'Comidas', startTime: '12:00', endTime: '16:00', sortOrder: 0 }]);
    const outsideServiceHoursIso = new Date(Date.now() + 24 * 60 * 60 * 1000);
    outsideServiceHoursIso.setHours(20, 0, 0, 0);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'Midnight Guest',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: outsideServiceHoursIso.toISOString(),
      durationMinutes: 90,
      notes: null,
      tableIds: [],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('outside_service_hours');
  });

  it('skips service window validation when no windows are configured', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed([]);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'Night Owl',
      customerPhoneSnapshot: null,
      partySize: 1,
      reservationAt: FUTURE_ISO,
      durationMinutes: 30,
      notes: null,
      tableIds: [],
      paymentMethod: 'bizum',
    });

    expect(result.ok).toBe(true);
  });

  it('creates a reservation when all validations pass with service windows', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    readRepo.seed([], new Map([['table-1', 4]]));
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'Ana Lopez',
      customerPhoneSnapshot: '+34 600 000 000',
      partySize: 2,
      reservationAt: FUTURE_ISO,
      durationMinutes: 90,
      notes: 'Mesa tranquila',
      tableIds: ['table-1'],
      paymentMethod: 'cash',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.customerNameSnapshot).toBe('Ana Lopez');
      expect(result.value.partySize).toBe(2);
      expect(result.value.depositAmountCents).toBe(2 * RESERVATION_DEPOSIT_PER_PERSON_CENTS);
      expect(result.value.depositPaidAt).toEqual(expect.any(String));
    }
  });

  it('returns restaurantNotFound if repository returns null', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    readRepo.seed([], new Map(), false);
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'nonexistent',
      customerNameSnapshot: 'Ghost',
      customerPhoneSnapshot: null,
      partySize: 1,
      reservationAt: FUTURE_ISO,
      durationMinutes: 60,
      notes: null,
      tableIds: [],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('restaurant_not_found');
  });

  it('propagates ApplicationErrorException from repository', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    readRepo.createReservation = async () => {
      throw new ApplicationErrorException(invalidReservationState({ reason: 'test' }));
    };
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);

    const result = await makeUseCase(readRepo, windowsRepo).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'Err Guest',
      customerPhoneSnapshot: null,
      partySize: 1,
      reservationAt: FUTURE_ISO,
      durationMinutes: 60,
      notes: null,
      tableIds: [],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_reservation_state');
  });

  it('returns payment_declined and does not create a reservation when the gateway declines the charge', async () => {
    // FakeReservationPaymentGateway siempre aprueba (igual que el cobro
    // mock de pedidos, ver checkout_mock_note), así que este camino se
    // ejercita con un gateway inyectado en vez del real: el objetivo es
    // proteger CreateRestaurantReservationUseCase para el día que se
    // sustituya el fake por una pasarela real que sí pueda rechazar.
    const readRepo = new InMemoryReservationReadRepository();
    readRepo.seed([], new Map([['table-1', 4]]));
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);
    const createSpy = vi.spyOn(readRepo, 'createReservation');
    const decliningGateway: ReservationPaymentGateway = {
      charge: vi.fn().mockResolvedValue({ approved: false, paymentReference: null }),
    };

    const result = await makeUseCase(readRepo, windowsRepo, decliningGateway).execute({
      restaurantId: 'r1',
      customerNameSnapshot: 'Declined Guest',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: FUTURE_ISO,
      durationMinutes: 90,
      notes: null,
      tableIds: ['table-1'],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('payment_declined');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('does not charge the deposit when an earlier validation already rejects the reservation', async () => {
    const readRepo = new InMemoryReservationReadRepository();
    const windowsRepo = new InMemoryServiceWindowsRepository();
    windowsRepo.seed(null);
    const chargeSpy = vi.fn().mockResolvedValue({ approved: true, paymentReference: 'unused' });

    const result = await makeUseCase(readRepo, windowsRepo, { charge: chargeSpy }).execute({
      restaurantId: 'r1',
      customerNameSnapshot: '',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: FUTURE_ISO,
      durationMinutes: 90,
      notes: null,
      tableIds: [],
      paymentMethod: 'card',
    });

    expect(result.ok).toBe(false);
    expect(chargeSpy).not.toHaveBeenCalled();
  });
});
