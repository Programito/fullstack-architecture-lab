import { Controller, Get, Inject, Query, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { USER_REPOSITORY, type UserRepository } from '../../../identity/application/ports/user-repository.port';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { RequireRoles, RolesGuard } from '../../../identity/presentation/rest/roles.guard';
import { ObservabilityService } from '../../application/observability.service';
import { DeveloperLogsQueryDto } from './dto/developer-logs-query.dto';
import { EntityOptionsQueryDto } from './dto/entity-options-query.dto';

@ApiTags('developer-logs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@RequireRoles('developer')
@Controller('developer/logs')
export class DeveloperLogsController {
  constructor(
    private readonly observability: ObservabilityService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  @Get('summary')
  @Version('1')
  @ApiOkResponse()
  async summary(@Query() query: DeveloperLogsQueryDto, @Req() request: AuthenticatedRequest) {
    const { from, to } = resolveRange(query);
    const restrictToUserIds = await this.resolveRestrictToUserIds(request);
    return this.observability.getSummary(from, to, { ...query, restrictToUserIds });
  }

  @Get('timeline')
  @Version('1')
  @ApiOkResponse()
  async timeline(@Query() query: DeveloperLogsQueryDto, @Req() request: AuthenticatedRequest) {
    const { from, to } = resolveRange(query);
    const restrictToUserIds = await this.resolveRestrictToUserIds(request);
    return this.observability.getTimeline(from, to, { ...query, restrictToUserIds });
  }

  @Get('breakdown')
  @Version('1')
  @ApiOkResponse()
  async breakdown(@Query() query: DeveloperLogsQueryDto, @Req() request: AuthenticatedRequest) {
    const { from, to } = resolveRange(query);
    const restrictToUserIds = await this.resolveRestrictToUserIds(request);
    return this.observability.getBreakdown(from, to, { ...query, restrictToUserIds });
  }

  @Get('events')
  @Version('1')
  @ApiOkResponse()
  async events(@Query() query: DeveloperLogsQueryDto, @Req() request: AuthenticatedRequest) {
    const { from, to } = resolveRange(query);
    const restrictToUserIds = await this.resolveRestrictToUserIds(request);
    return this.observability.listEvents({
      from,
      to,
      level: query.level,
      category: query.category,
      clientOrigin: query.clientOrigin,
      path: query.path,
      userId: query.userId,
      actorUserId: query.actorUserId,
      restaurantId: query.restaurantId,
      result: query.result,
      entityType: query.entityType,
      entityId: query.entityId,
      search: query.search,
      restrictToUserIds,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('entity-options')
  @Version('1')
  @ApiOkResponse()
  async entityOptions(@Query() query: EntityOptionsQueryDto, @Req() request: AuthenticatedRequest) {
    const restrictToUserIds = await this.resolveRestrictToUserIds(request);
    return this.observability.listEntityOptions(query.entityType, query.restaurantId, restrictToUserIds);
  }

  @Get('actor-options')
  @Version('1')
  @ApiOkResponse()
  async actorOptions(@Req() request: AuthenticatedRequest) {
    const restrictToUserIds = await this.resolveRestrictToUserIds(request);
    return this.observability.listActorOptions(restrictToUserIds);
  }

  private async resolveRestrictToUserIds(request: AuthenticatedRequest): Promise<string[] | undefined> {
    if (request.auth.accountType !== 'demo') return undefined;
    const allUsers = await this.users.findAll();
    return allUsers.filter((user) => user.accountType === 'demo').map((user) => user.id);
  }
}

function resolveRange(query: DeveloperLogsQueryDto): { from: Date; to: Date } {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { from, to };
}
