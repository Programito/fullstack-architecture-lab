import { Controller, Get, Version } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { DatabaseReadinessService } from './database-readiness.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly databaseReadiness: DatabaseReadinessService) {}

  @Get()
  @Version('1')
  @ApiOkResponse({
    description: 'Backend health status.',
    schema: {
      example: {
        status: 'ok',
      },
    },
  })
  getHealth() {
    return { status: 'ok' };
  }

  @Get('readiness')
  @Version('1')
  @ApiOkResponse({
    description: 'Backend readiness status, including database wake-up state.',
    schema: {
      example: {
        status: 'ready',
        database: 'ready',
        durationMs: 84,
      },
    },
  })
  getReadiness() {
    return this.databaseReadiness.check();
  }
}
