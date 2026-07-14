import { randomUUID } from 'node:crypto';

import type { UserRepository } from '../../../identity/application/ports/user-repository.port';
import type {
  CloseTimeEntryInput,
  CreateTimeEntryChangeRequestInput,
  CreateTimeEntryInput,
  ListTimeEntriesQuery,
  ListTimeEntryChangeRequestsQuery,
  ReviewTimeEntryChangeRequestInput,
  TimeTrackingRepository,
} from '../../application/ports/time-tracking-repository.port';
import type { TimeEntry, TimeEntryChangeRequestView, TimeEntryView } from '../../domain/time-tracking.models';

type StoredTimeEntryChangeRequest = {
  id: string;
  timeEntryId: string;
  restaurantId: string;
  requestedByUserId: string;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  requestedClockInNote: string | null;
  requestedClockOutNote: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export class InMemoryTimeTrackingRepository implements TimeTrackingRepository {
  private readonly entries = new Map<string, TimeEntry>();
  private readonly changeRequests = new Map<string, StoredTimeEntryChangeRequest>();

  constructor(private readonly userRepository: UserRepository) {}

  clear(): void {
    this.entries.clear();
    this.changeRequests.clear();
  }

  async findOpenEntryForUser(restaurantId: string, userId: string): Promise<TimeEntry | null> {
    const entry = [...this.entries.values()]
      .filter((candidate) => candidate.restaurantId === restaurantId && candidate.userId === userId && candidate.status === 'open')
      .sort((left, right) => right.clockInAt.localeCompare(left.clockInAt))[0];

    return entry ? cloneEntry(entry) : null;
  }

  async createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
    const now = input.clockInAt;
    const entry: TimeEntry = {
      id: randomUUID(),
      userId: input.userId,
      restaurantId: input.restaurantId,
      clockInAt: input.clockInAt,
      clockOutAt: null,
      clockInNote: input.clockInNote,
      clockOutNote: null,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry);
    return cloneEntry(entry);
  }

  async findTimeEntryById(timeEntryId: string): Promise<TimeEntryView | null> {
    const entry = this.entries.get(timeEntryId);
    if (!entry) {
      return null;
    }
    return this.buildTimeEntryView(entry);
  }

  async closeTimeEntry(input: CloseTimeEntryInput): Promise<TimeEntry> {
    const current = this.entries.get(input.timeEntryId);
    if (!current) {
      throw new Error(`Time entry ${input.timeEntryId} not found.`);
    }

    const updated: TimeEntry = {
      ...current,
      clockOutAt: input.clockOutAt,
      clockOutNote: input.clockOutNote,
      status: 'closed',
      updatedAt: input.clockOutAt,
    };
    this.entries.set(updated.id, updated);
    return cloneEntry(updated);
  }

  async listTimeEntries(query: ListTimeEntriesQuery): Promise<TimeEntryView[]> {
    const filtered = [...this.entries.values()]
      .filter((entry) => entry.restaurantId === query.restaurantId)
      .filter((entry) => (query.scope === 'self' ? entry.userId === query.requesterUserId : true))
      .filter((entry) => (query.workerUserId ? entry.userId === query.workerUserId : true))
      .filter((entry) => (query.status ? entry.status === query.status : true))
      .filter((entry) => isWithinDateRange(entry.clockInAt, query.dateFrom, query.dateTo))
      .sort((left, right) => right.clockInAt.localeCompare(left.clockInAt));

    return Promise.all(filtered.map((entry) => this.buildTimeEntryView(entry)));
  }

  async createTimeEntryChangeRequest(input: CreateTimeEntryChangeRequestInput): Promise<TimeEntryChangeRequestView> {
    const now = new Date().toISOString();
    const request: StoredTimeEntryChangeRequest = {
      id: randomUUID(),
      timeEntryId: input.timeEntryId,
      restaurantId: input.restaurantId,
      requestedByUserId: input.requestedByUserId,
      requestedClockInAt: input.requestedClockInAt,
      requestedClockOutAt: input.requestedClockOutAt,
      requestedClockInNote: input.requestedClockInNote,
      requestedClockOutNote: input.requestedClockOutNote,
      reason: input.reason,
      status: 'pending',
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: now,
      updatedAt: now,
    };
    this.changeRequests.set(request.id, request);
    return this.buildTimeEntryChangeRequestView(request);
  }

  async listTimeEntryChangeRequests(query: ListTimeEntryChangeRequestsQuery): Promise<TimeEntryChangeRequestView[]> {
    const filtered = [...this.changeRequests.values()]
      .filter((request) => request.restaurantId === query.restaurantId)
      .filter((request) => (query.status ? request.status === query.status : true))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return Promise.all(filtered.map((request) => this.buildTimeEntryChangeRequestView(request)));
  }

  async findTimeEntryChangeRequestById(requestId: string): Promise<TimeEntryChangeRequestView | null> {
    const request = this.changeRequests.get(requestId);
    if (!request) {
      return null;
    }
    return this.buildTimeEntryChangeRequestView(request);
  }

  async reviewTimeEntryChangeRequest(input: ReviewTimeEntryChangeRequestInput): Promise<TimeEntryChangeRequestView> {
    const current = this.changeRequests.get(input.requestId);
    if (!current) {
      throw new Error(`Time entry change request ${input.requestId} not found.`);
    }

    const updatedRequest: StoredTimeEntryChangeRequest = {
      ...current,
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedAt: input.reviewedAt,
      reviewedByUserId: input.reviewerUserId,
      updatedAt: input.reviewedAt,
    };
    this.changeRequests.set(updatedRequest.id, updatedRequest);

    if (input.status === 'approved') {
      const currentEntry = this.entries.get(updatedRequest.timeEntryId);
      if (!currentEntry) {
        throw new Error(`Time entry ${updatedRequest.timeEntryId} not found.`);
      }
      const correctedEntry: TimeEntry = {
        ...currentEntry,
        clockInAt: updatedRequest.requestedClockInAt ?? currentEntry.clockInAt,
        clockOutAt: updatedRequest.requestedClockOutAt ?? currentEntry.clockOutAt,
        clockInNote: updatedRequest.requestedClockInNote ?? currentEntry.clockInNote,
        clockOutNote: updatedRequest.requestedClockOutNote ?? currentEntry.clockOutNote,
        status: 'corrected',
        updatedAt: input.reviewedAt,
      };
      this.entries.set(correctedEntry.id, correctedEntry);
    }

    return this.buildTimeEntryChangeRequestView(updatedRequest);
  }

  private async buildTimeEntryView(entry: TimeEntry): Promise<TimeEntryView> {
    const user = await this.userRepository.findById(entry.userId);
    if (!user) {
      throw new Error(`User ${entry.userId} not found.`);
    }

    return {
      entry: cloneEntry(entry),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  }

  private async buildTimeEntryChangeRequestView(request: StoredTimeEntryChangeRequest): Promise<TimeEntryChangeRequestView> {
    const timeEntry = await this.findTimeEntryById(request.timeEntryId);
    const requestedByUser = await this.userRepository.findById(request.requestedByUserId);
    const reviewedByUser = request.reviewedByUserId
      ? await this.userRepository.findById(request.reviewedByUserId)
      : null;

    if (!timeEntry || !requestedByUser) {
      throw new Error(`Time entry change request ${request.id} is missing linked data.`);
    }

    return {
      id: request.id,
      restaurantId: request.restaurantId,
      status: request.status,
      reason: request.reason,
      reviewNote: request.reviewNote,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      requestedClockInAt: request.requestedClockInAt,
      requestedClockOutAt: request.requestedClockOutAt,
      requestedClockInNote: request.requestedClockInNote,
      requestedClockOutNote: request.requestedClockOutNote,
      timeEntry,
      requestedByUser: {
        id: requestedByUser.id,
        firstName: requestedByUser.firstName,
        lastName: requestedByUser.lastName,
        email: requestedByUser.email,
      },
      reviewedByUser: reviewedByUser
        ? {
            id: reviewedByUser.id,
            firstName: reviewedByUser.firstName,
            lastName: reviewedByUser.lastName,
            email: reviewedByUser.email,
          }
        : null,
    };
  }
}

function cloneEntry(entry: TimeEntry): TimeEntry {
  return { ...entry };
}

function isWithinDateRange(clockInAt: string, dateFrom?: string, dateTo?: string): boolean {
  const timestamp = new Date(clockInAt).getTime();
  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
    if (timestamp < from) {
      return false;
    }
  }
  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999Z`).getTime();
    if (timestamp > to) {
      return false;
    }
  }
  return true;
}
