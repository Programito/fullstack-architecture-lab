import type { TimeEntry, TimeEntryChangeRequestView, TimeEntryView } from '../../domain/time-tracking.models';

export const TIME_TRACKING_REPOSITORY = Symbol('TIME_TRACKING_REPOSITORY');

export type ListTimeEntriesQuery = {
  restaurantId: string;
  scope: 'self' | 'team';
  requesterUserId: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'open' | 'closed' | 'corrected';
  workerUserId?: string;
};

export type CreateTimeEntryInput = {
  userId: string;
  restaurantId: string;
  clockInAt: string;
  clockInNote: string | null;
};

export type CloseTimeEntryInput = {
  timeEntryId: string;
  clockOutAt: string;
  clockOutNote: string | null;
};

export type CreateTimeEntryChangeRequestInput = {
  timeEntryId: string;
  restaurantId: string;
  requestedByUserId: string;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  requestedClockInNote: string | null;
  requestedClockOutNote: string | null;
  reason: string;
};

export type ReviewTimeEntryChangeRequestInput = {
  requestId: string;
  reviewerUserId: string;
  status: 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedAt: string;
};

export type ListTimeEntryChangeRequestsQuery = {
  restaurantId: string;
  status?: 'pending' | 'approved' | 'rejected';
};

export interface TimeTrackingRepository {
  findOpenEntryForUser(restaurantId: string, userId: string): Promise<TimeEntry | null>;
  createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry>;
  findTimeEntryById(timeEntryId: string): Promise<TimeEntryView | null>;
  closeTimeEntry(input: CloseTimeEntryInput): Promise<TimeEntry>;
  listTimeEntries(query: ListTimeEntriesQuery): Promise<TimeEntryView[]>;
  createTimeEntryChangeRequest(input: CreateTimeEntryChangeRequestInput): Promise<TimeEntryChangeRequestView>;
  listTimeEntryChangeRequests(query: ListTimeEntryChangeRequestsQuery): Promise<TimeEntryChangeRequestView[]>;
  findTimeEntryChangeRequestById(requestId: string): Promise<TimeEntryChangeRequestView | null>;
  reviewTimeEntryChangeRequest(input: ReviewTimeEntryChangeRequestInput): Promise<TimeEntryChangeRequestView>;
}
