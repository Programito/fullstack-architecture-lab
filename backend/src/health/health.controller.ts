import { Controller, Get, Version } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
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
}
