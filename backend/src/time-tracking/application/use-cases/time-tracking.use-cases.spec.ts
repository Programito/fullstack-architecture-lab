import { describe, expect, it, vi } from 'vitest';

import { isErr, isOk } from '../../../shared/result/result';
import type { TimeTrackingRepository } from '../ports/time-tracking-repository.port';
import { ClockInUseCase } from './clock-in.use-case';
import { ClockOutUseCase } from './clock-out.use-case';
import { CreateTimeEntryChangeRequestUseCase } from './create-time-entry-change-request.use-case';
import { ListTimeEntriesUseCase } from './list-time-entries.use-case';
import { ReviewTimeEntryChangeRequestUseCase } from './review-time-entry-change-request.use-case';

const ENTRY_ID = 'entry-1';
const RESTAURANT_ID = 'restaurant-1';
const USER_ID = 'user-1';

function createRepositoryMock(): TimeTrackingRepository {
  return {
    findOpenEntryForUser: vi.fn(),
    createTimeEntry: vi.fn(),
    findTimeEntryById: vi.fn(),
    closeTimeEntry: vi.fn(),
    listTimeEntries: vi.fn(),
    createTimeEntryChangeRequest: vi.fn(),
    listTimeEntryChangeRequests: vi.fn(),
    findTimeEntryChangeRequestById: vi.fn(),
    reviewTimeEntryChangeRequest: vi.fn(),
  };
}

describe('Time tracking use cases', () => {
  it('opens a valid time entry', async () => {
    const repository = createRepositoryMock();
    repository.findOpenEntryForUser = vi.fn().mockResolvedValue(null);
    repository.createTimeEntry = vi.fn().mockResolvedValue({
      id: ENTRY_ID,
      userId: USER_ID,
      restaurantId: RESTAURANT_ID,
      clockInAt: '2026-07-07T08:00:00.000Z',
      clockOutAt: null,
      clockInNote: 'Empiezo turno',
      clockOutNote: null,
      status: 'open',
      createdAt: '2026-07-07T08:00:00.000Z',
      updatedAt: '2026-07-07T08:00:00.000Z',
    });
    const useCase = new ClockInUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      userId: USER_ID,
      clockInAt: '2026-07-07T08:00:00.000Z',
      clockInNote: 'Empiezo turno',
    });

    expect(isOk(result)).toBe(true);
    expect(repository.createTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, restaurantId: RESTAURANT_ID }),
    );
  });

  it('prevents opening a second active time entry', async () => {
    const repository = createRepositoryMock();
    repository.findOpenEntryForUser = vi.fn().mockResolvedValue({ id: ENTRY_ID });
    const useCase = new ClockInUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      userId: USER_ID,
      clockInAt: '2026-07-07T08:00:00.000Z',
      clockInNote: null,
    });

    expect(isErr(result)).toBe(true);
    expect(repository.createTimeEntry).not.toHaveBeenCalled();
  });

  it('closes an open time entry owned by the requester', async () => {
    const repository = createRepositoryMock();
    repository.findTimeEntryById = vi.fn().mockResolvedValue({
      entry: {
        id: ENTRY_ID,
        userId: USER_ID,
        restaurantId: RESTAURANT_ID,
        status: 'open',
      },
    });
    repository.closeTimeEntry = vi.fn().mockResolvedValue({ id: ENTRY_ID, status: 'closed' });
    const useCase = new ClockOutUseCase(repository);

    const result = await useCase.execute({
      timeEntryId: ENTRY_ID,
      userId: USER_ID,
      clockOutAt: '2026-07-07T16:00:00.000Z',
      clockOutNote: 'Fin de turno',
    });

    expect(isOk(result)).toBe(true);
    expect(repository.closeTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ timeEntryId: ENTRY_ID, clockOutNote: 'Fin de turno' }),
    );
  });

  it('rejects closing a time entry owned by another worker', async () => {
    const repository = createRepositoryMock();
    repository.findTimeEntryById = vi.fn().mockResolvedValue({
      entry: {
        id: ENTRY_ID,
        userId: 'user-2',
        restaurantId: RESTAURANT_ID,
        status: 'open',
      },
    });
    const useCase = new ClockOutUseCase(repository);

    const result = await useCase.execute({
      timeEntryId: ENTRY_ID,
      userId: USER_ID,
      clockOutAt: '2026-07-07T16:00:00.000Z',
      clockOutNote: null,
    });

    expect(isErr(result)).toBe(true);
    expect(repository.closeTimeEntry).not.toHaveBeenCalled();
  });

  it('creates a change request for the owner time entry', async () => {
    const repository = createRepositoryMock();
    repository.findTimeEntryById = vi.fn().mockResolvedValue({
      entry: { id: ENTRY_ID, userId: USER_ID, restaurantId: RESTAURANT_ID },
    });
    repository.createTimeEntryChangeRequest = vi.fn().mockResolvedValue({ id: 'change-1', status: 'pending' });
    const useCase = new CreateTimeEntryChangeRequestUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      requesterUserId: USER_ID,
      timeEntryId: ENTRY_ID,
      requestedClockInAt: '2026-07-07T07:55:00.000Z',
      requestedClockOutAt: null,
      requestedClockInNote: null,
      requestedClockOutNote: null,
      reason: 'Entre cinco minutos antes',
    });

    expect(isOk(result)).toBe(true);
    expect(repository.createTimeEntryChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ timeEntryId: ENTRY_ID, requestedByUserId: USER_ID }),
    );
  });

  it('only allows manager or admin to list team entries', async () => {
    const repository = createRepositoryMock();
    const useCase = new ListTimeEntriesUseCase(repository);

    const result = await useCase.execute({
      restaurantId: RESTAURANT_ID,
      requesterUserId: USER_ID,
      requesterRoles: ['waiter'],
      scope: 'team',
    });

    expect(isErr(result)).toBe(true);
    expect(repository.listTimeEntries).not.toHaveBeenCalled();
  });

  it('only allows manager or admin to approve change requests', async () => {
    const repository = createRepositoryMock();
    const useCase = new ReviewTimeEntryChangeRequestUseCase(repository);

    const result = await useCase.execute({
      requestId: 'change-1',
      reviewerUserId: USER_ID,
      reviewerRoles: ['waiter'],
      restaurantId: RESTAURANT_ID,
      status: 'approved',
      reviewNote: 'OK',
      reviewedAt: '2026-07-07T16:05:00.000Z',
    });

    expect(isErr(result)).toBe(true);
    expect(repository.reviewTimeEntryChangeRequest).not.toHaveBeenCalled();
  });
});
