import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../shared/prisma/prisma.service';
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

@Injectable()
export class PrismaTimeTrackingRepository implements TimeTrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOpenEntryForUser(restaurantId: string, userId: string): Promise<TimeEntry | null> {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { restaurantId, userId, status: 'open' },
      orderBy: { clockInAt: 'desc' },
    });
    return entry ? mapTimeEntry(entry) : null;
  }

  async createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
    const entry = await this.prisma.timeEntry.create({
      data: {
        userId: input.userId,
        restaurantId: input.restaurantId,
        clockInAt: new Date(input.clockInAt),
        clockInNote: input.clockInNote,
      },
    });
    return mapTimeEntry(entry);
  }

  async findTimeEntryById(timeEntryId: string): Promise<TimeEntryView | null> {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: { user: true },
    });
    return entry ? mapTimeEntryView(entry) : null;
  }

  async closeTimeEntry(input: CloseTimeEntryInput): Promise<TimeEntry> {
    const entry = await this.prisma.timeEntry.update({
      where: { id: input.timeEntryId },
      data: {
        clockOutAt: new Date(input.clockOutAt),
        clockOutNote: input.clockOutNote,
        status: 'closed',
      },
    });
    return mapTimeEntry(entry);
  }

  async listTimeEntries(query: ListTimeEntriesQuery): Promise<TimeEntryView[]> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        restaurantId: query.restaurantId,
        userId: query.scope === 'self' ? query.requesterUserId : query.workerUserId,
        status: query.status,
        clockInAt: buildDateRange(query.dateFrom, query.dateTo),
      },
      include: { user: true },
      orderBy: [{ clockInAt: 'desc' }, { createdAt: 'desc' }],
    });

    return entries.map(mapTimeEntryView);
  }

  async createTimeEntryChangeRequest(input: CreateTimeEntryChangeRequestInput): Promise<TimeEntryChangeRequestView> {
    const request = await this.prisma.timeEntryChangeRequest.create({
      data: {
        timeEntryId: input.timeEntryId,
        restaurantId: input.restaurantId,
        requestedByUserId: input.requestedByUserId,
        requestedClockInAt: input.requestedClockInAt ? new Date(input.requestedClockInAt) : null,
        requestedClockOutAt: input.requestedClockOutAt ? new Date(input.requestedClockOutAt) : null,
        requestedClockInNote: input.requestedClockInNote,
        requestedClockOutNote: input.requestedClockOutNote,
        reason: input.reason,
      },
      include: changeRequestInclude,
    });

    return mapTimeEntryChangeRequestView(request);
  }

  async listTimeEntryChangeRequests(query: ListTimeEntryChangeRequestsQuery): Promise<TimeEntryChangeRequestView[]> {
    const requests = await this.prisma.timeEntryChangeRequest.findMany({
      where: {
        restaurantId: query.restaurantId,
        status: query.status,
      },
      include: changeRequestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });

    return requests.map(mapTimeEntryChangeRequestView);
  }

  async findTimeEntryChangeRequestById(requestId: string): Promise<TimeEntryChangeRequestView | null> {
    const request = await this.prisma.timeEntryChangeRequest.findUnique({
      where: { id: requestId },
      include: changeRequestInclude,
    });

    return request ? mapTimeEntryChangeRequestView(request) : null;
  }

  async reviewTimeEntryChangeRequest(input: ReviewTimeEntryChangeRequestInput): Promise<TimeEntryChangeRequestView> {
    return this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.timeEntryChangeRequest.update({
        where: { id: input.requestId },
        data: {
          status: input.status,
          reviewNote: input.reviewNote,
          reviewedAt: new Date(input.reviewedAt),
          reviewedByUserId: input.reviewerUserId,
        },
        include: changeRequestInclude,
      });

      if (input.status === 'approved') {
        await tx.timeEntry.update({
          where: { id: updatedRequest.timeEntryId },
          data: {
            clockInAt: updatedRequest.requestedClockInAt ?? updatedRequest.timeEntry.clockInAt,
            clockOutAt: updatedRequest.requestedClockOutAt ?? updatedRequest.timeEntry.clockOutAt,
            clockInNote: updatedRequest.requestedClockInNote ?? updatedRequest.timeEntry.clockInNote,
            clockOutNote: updatedRequest.requestedClockOutNote ?? updatedRequest.timeEntry.clockOutNote,
            status: 'corrected',
          },
        });
      }

      const refreshed = await tx.timeEntryChangeRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        include: changeRequestInclude,
      });
      return mapTimeEntryChangeRequestView(refreshed);
    });
  }
}

const changeRequestInclude = {
  timeEntry: { include: { user: true } },
  requestedByUser: true,
  reviewedByUser: true,
} satisfies Prisma.TimeEntryChangeRequestInclude;

function buildDateRange(dateFrom?: string, dateTo?: string): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) return undefined;
  return {
    gte: dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : undefined,
    lte: dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined,
  };
}

function mapTimeEntry(entry: {
  id: string;
  userId: string;
  restaurantId: string;
  clockInAt: Date;
  clockOutAt: Date | null;
  clockInNote: string | null;
  clockOutNote: string | null;
  status: 'open' | 'closed' | 'corrected';
  createdAt: Date;
  updatedAt: Date;
}): TimeEntry {
  return {
    id: entry.id,
    userId: entry.userId,
    restaurantId: entry.restaurantId,
    clockInAt: entry.clockInAt.toISOString(),
    clockOutAt: entry.clockOutAt?.toISOString() ?? null,
    clockInNote: entry.clockInNote,
    clockOutNote: entry.clockOutNote,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function mapTimeEntryView(entry: Prisma.TimeEntryGetPayload<{ include: { user: true } }>): TimeEntryView {
  return {
    entry: mapTimeEntry(entry),
    user: {
      id: entry.user.id,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      email: entry.user.email,
    },
  };
}

function mapTimeEntryChangeRequestView(
  request: Prisma.TimeEntryChangeRequestGetPayload<{ include: typeof changeRequestInclude }>,
): TimeEntryChangeRequestView {
  return {
    id: request.id,
    restaurantId: request.restaurantId,
    status: request.status,
    reason: request.reason,
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    requestedClockInAt: request.requestedClockInAt?.toISOString() ?? null,
    requestedClockOutAt: request.requestedClockOutAt?.toISOString() ?? null,
    requestedClockInNote: request.requestedClockInNote,
    requestedClockOutNote: request.requestedClockOutNote,
    timeEntry: mapTimeEntryView(request.timeEntry),
    requestedByUser: {
      id: request.requestedByUser.id,
      firstName: request.requestedByUser.firstName,
      lastName: request.requestedByUser.lastName,
      email: request.requestedByUser.email,
    },
    reviewedByUser: request.reviewedByUser
      ? {
          id: request.reviewedByUser.id,
          firstName: request.reviewedByUser.firstName,
          lastName: request.reviewedByUser.lastName,
          email: request.reviewedByUser.email,
        }
      : null,
  };
}
