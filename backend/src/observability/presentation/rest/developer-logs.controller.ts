import { Controller, Get, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { RequireRoles, RolesGuard } from '../../../identity/presentation/rest/roles.guard';
import { ObservabilityService } from '../../application/observability.service';
import { DeveloperLogsQueryDto } from './dto/developer-logs-query.dto';

@ApiTags('developer-logs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@RequireRoles('developer')
@Controller('developer/logs')
export class DeveloperLogsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get('summary')
  @Version('1')
  @ApiOkResponse()
  async summary(@Query() query: DeveloperLogsQueryDto) {
    const { from, to } = resolveRange(query);
    return this.observability.getSummary(from, to, query);
  }

  @Get('timeline')
  @Version('1')
  @ApiOkResponse()
  async timeline(@Query() query: DeveloperLogsQueryDto) {
    const { from, to } = resolveRange(query);
    return this.observability.getTimeline(from, to, query);
  }

  @Get('breakdown')
  @Version('1')
  @ApiOkResponse()
  async breakdown(@Query() query: DeveloperLogsQueryDto) {
    const { from, to } = resolveRange(query);
    return this.observability.getBreakdown(from, to, query);
  }

  @Get('events')
  @Version('1')
  @ApiOkResponse()
  async events(@Query() query: DeveloperLogsQueryDto) {
    const { from, to } = resolveRange(query);
    return this.observability.listEvents({
      from,
      to,
      level: query.level,
      category: query.category,
      path: query.path,
      userId: query.userId,
      actorUserId: query.actorUserId,
      restaurantId: query.restaurantId,
      result: query.result,
      entityType: query.entityType,
      entityId: query.entityId,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}

function resolveRange(query: DeveloperLogsQueryDto): { from: Date; to: Date } {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { from, to };
}
