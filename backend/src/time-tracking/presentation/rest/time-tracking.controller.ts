import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards, Version } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { USER_REPOSITORY, type UserRepository } from '../../../identity/application/ports/user-repository.port';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { auditContext } from '../../../observability/application/audit-context';
import { AuditService } from '../../../observability/application/audit.service';
import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { ClockInUseCase } from '../../application/use-cases/clock-in.use-case';
import { ClockOutUseCase } from '../../application/use-cases/clock-out.use-case';
import { CreateTimeEntryChangeRequestUseCase } from '../../application/use-cases/create-time-entry-change-request.use-case';
import { ListTimeEntriesUseCase } from '../../application/use-cases/list-time-entries.use-case';
import { ListTimeEntryChangeRequestsUseCase } from '../../application/use-cases/list-time-entry-change-requests.use-case';
import { ReviewTimeEntryChangeRequestUseCase } from '../../application/use-cases/review-time-entry-change-request.use-case';
import { CloseTimeEntryDto } from './dto/close-time-entry.dto';
import { CreateTimeEntryChangeRequestDto } from './dto/create-time-entry-change-request.dto';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { ReviewTimeEntryChangeRequestDto } from './dto/review-time-entry-change-request.dto';
import { TimeEntryChangeRequestResponseDto } from './dto/time-entry-change-request-response.dto';
import { TimeEntryResponseDto } from './dto/time-entry-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class TimeTrackingController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly clockIn: ClockInUseCase,
    private readonly clockOut: ClockOutUseCase,
    private readonly listTimeEntries: ListTimeEntriesUseCase,
    private readonly createTimeEntryChangeRequest: CreateTimeEntryChangeRequestUseCase,
    private readonly listTimeEntryChangeRequests: ListTimeEntryChangeRequestsUseCase,
    private readonly reviewTimeEntryChangeRequest: ReviewTimeEntryChangeRequestUseCase,
    private readonly audit: AuditService,
  ) {}

  @Post(':id/time-entries/clock-in')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('time_tracking')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: TimeEntryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async createEntry(
    @Param('id') restaurantId: string,
    @Body() body: CreateTimeEntryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TimeEntryResponseDto> {
    const user = await this.getResponseUser(request.auth.userId);
    const entry = unwrapResultOrThrow(
      await this.clockIn.execute({
        restaurantId,
        userId: request.auth.userId,
        clockInAt: body.clockInAt,
        clockInNote: body.clockInNote ?? null,
      }),
    );
    await this.audit.record({
      ...auditContext(request, restaurantId),
      event: 'time-entry.clocked-in',
      message: `Time entry ${entry.id} clocked in.`,
      entityType: 'auth',
      entityId: request.auth.userId,
      changedFields: ['clockInAt', 'clockInNote', 'status'],
      metadata: { timeEntryId: entry.id, clockInAt: entry.clockInAt },
    });
    return TimeEntryResponseDto.fromDomain({
      entry,
      user,
    });
  }

  @Patch(':id/time-entries/:timeEntryId/clock-out')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('time_tracking')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: TimeEntryResponseDto })
  async closeEntry(
    @Param('id') restaurantId: string,
    @Param('timeEntryId') timeEntryId: string,
    @Body() body: CloseTimeEntryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TimeEntryResponseDto> {
    const user = await this.getResponseUser(request.auth.userId);
    const entry = unwrapResultOrThrow(
      await this.clockOut.execute({
        timeEntryId,
        userId: request.auth.userId,
        clockOutAt: body.clockOutAt,
        clockOutNote: body.clockOutNote ?? null,
      }),
    );
    await this.audit.record({
      ...auditContext(request, restaurantId),
      event: 'time-entry.clocked-out',
      message: `Time entry ${entry.id} clocked out.`,
      entityType: 'auth',
      entityId: request.auth.userId,
      changedFields: ['clockOutAt', 'clockOutNote', 'status'],
      metadata: { timeEntryId: entry.id, clockOutAt: entry.clockOutAt },
    });
    return TimeEntryResponseDto.fromDomain({
      entry,
      user,
    });
  }

  @Get(':id/time-entries/me')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('time_tracking')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: TimeEntryResponseDto, isArray: true })
  async listOwnEntries(
    @Param('id') restaurantId: string,
    @Req() request: AuthenticatedRequest,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<TimeEntryResponseDto[]> {
    const entries = unwrapResultOrThrow(
      await this.listTimeEntries.execute({
        restaurantId,
        requesterUserId: request.auth.userId,
        requesterRoles: request.auth.roles,
        scope: 'self',
        dateFrom,
        dateTo,
      }),
    );
    return entries.map(TimeEntryResponseDto.fromDomain);
  }

  @Get(':id/time-entries/team')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('time_tracking')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: TimeEntryResponseDto, isArray: true })
  async listTeamEntries(
    @Param('id') restaurantId: string,
    @Req() request: AuthenticatedRequest,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: 'open' | 'closed' | 'corrected',
    @Query('workerUserId') workerUserId?: string,
  ): Promise<TimeEntryResponseDto[]> {
    const entries = unwrapResultOrThrow(
      await this.listTimeEntries.execute({
        restaurantId,
        requesterUserId: request.auth.userId,
        requesterRoles: request.auth.roles,
        scope: 'team',
        dateFrom,
        dateTo,
        status,
        workerUserId,
      }),
    );
    return entries.map(TimeEntryResponseDto.fromDomain);
  }

  @Post(':id/time-entry-change-requests')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('time_tracking')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: TimeEntryChangeRequestResponseDto })
  async createChangeRequest(
    @Param('id') restaurantId: string,
    @Body() body: CreateTimeEntryChangeRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TimeEntryChangeRequestResponseDto> {
    const changeRequest = unwrapResultOrThrow(
      await this.createTimeEntryChangeRequest.execute({
        restaurantId,
        requesterUserId: request.auth.userId,
        timeEntryId: body.timeEntryId,
        requestedClockInAt: body.requestedClockInAt ?? null,
        requestedClockOutAt: body.requestedClockOutAt ?? null,
        requestedClockInNote: body.requestedClockInNote ?? null,
        requestedClockOutNote: body.requestedClockOutNote ?? null,
        reason: body.reason,
      }),
    );
    await this.audit.record({
      ...auditContext(request, restaurantId),
      event: 'time-entry.change-request.created',
      message: `Time entry change request ${changeRequest.id} created.`,
      entityType: 'auth',
      entityId: request.auth.userId,
      changedFields: ['requestedClockInAt', 'requestedClockOutAt', 'requestedClockInNote', 'requestedClockOutNote', 'reason', 'status'],
      metadata: { timeEntryChangeRequestId: changeRequest.id, timeEntryId: changeRequest.timeEntry.entry.id },
    });
    return TimeEntryChangeRequestResponseDto.fromDomain(changeRequest);
  }

  @Get(':id/time-entry-change-requests')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('time_tracking')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: TimeEntryChangeRequestResponseDto, isArray: true })
  async listChangeRequests(
    @Param('id') restaurantId: string,
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ): Promise<TimeEntryChangeRequestResponseDto[]> {
    const requests = unwrapResultOrThrow(
      await this.listTimeEntryChangeRequests.execute({
        restaurantId,
        requesterRoles: request.auth.roles,
        status,
      }),
    );
    return requests.map(TimeEntryChangeRequestResponseDto.fromDomain);
  }

  @Patch(':id/time-entry-change-requests/:requestId/review')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('time_tracking')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: TimeEntryChangeRequestResponseDto })
  async reviewChangeRequest(
    @Param('id') restaurantId: string,
    @Param('requestId') requestId: string,
    @Body() body: ReviewTimeEntryChangeRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TimeEntryChangeRequestResponseDto> {
    const reviewedRequest = unwrapResultOrThrow(
      await this.reviewTimeEntryChangeRequest.execute({
        requestId,
        reviewerUserId: request.auth.userId,
        reviewerRoles: request.auth.roles,
        restaurantId,
        status: body.status,
        reviewNote: body.reviewNote ?? null,
        reviewedAt: new Date().toISOString(),
      }),
    );
    await this.audit.record({
      ...auditContext(request, restaurantId),
      event: `time-entry.change-request.${body.status}`,
      message: `Time entry change request ${reviewedRequest.id} ${body.status}.`,
      entityType: 'auth',
      entityId: request.auth.userId,
      changedFields: ['status', 'reviewNote', 'reviewedAt'],
      metadata: { timeEntryChangeRequestId: reviewedRequest.id, reviewStatus: reviewedRequest.status },
    });
    return TimeEntryChangeRequestResponseDto.fromDomain(reviewedRequest);
  }

  private async getResponseUser(userId: string): Promise<TimeEntryResponseDto['user']> {
    const user = await this.users.findById(userId);
    if (!user) {
      return { id: userId, firstName: '', lastName: '', email: '' };
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }
}
