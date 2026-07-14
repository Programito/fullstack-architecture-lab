import { Body, Controller, HttpCode, Post, UseGuards, Version } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { ObservabilityService } from '../../application/observability.service';
import { ClientLogDto } from './dto/client-log.dto';

@ApiTags('observability')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('observability')
export class ClientLogsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Post('client-events')
  @Version('1')
  @HttpCode(202)
  @ApiCreatedResponse({ description: 'Client event accepted.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async ingest(@Body() body: ClientLogDto): Promise<{ accepted: true }> {
    await this.observability.record({
      source: 'frontend',
      category: 'client',
      level: body.level,
      event: body.event,
      message: body.message,
      path: sanitizePath(body.path),
      metadata: sanitizeMetadata(body.metadata) as Prisma.InputJsonValue | null,
    });
    return { accepted: true };
  }
}

function sanitizePath(path?: string): string | null {
  if (!path) return null;
  return path.slice(0, 200);
}

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | null {
  if (!metadata) return null;
  const entries = Object.entries(metadata)
    .slice(0, 12)
    .map(([key, value]) => [key.slice(0, 80), sanitizeValue(value)]);
  return Object.fromEntries(entries);
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.slice(0, 200);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(sanitizeValue);
  return String(value).slice(0, 200);
}
