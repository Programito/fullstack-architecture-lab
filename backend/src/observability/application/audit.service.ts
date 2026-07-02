import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AuditEntityType, AuditResult } from './audit-event.types';
import { ObservabilityService } from './observability.service';

@Injectable()
export class AuditService {
  constructor(private readonly observability: ObservabilityService) {}

  async record(input: {
    event: string;
    message: string;
    actorRoles?: string[];
    result?: AuditResult;
    entityType?: AuditEntityType;
    entityId?: string | null;
    entityLabel?: string | null;
    changedFields?: string[];
    organizationId?: string | null;
    userId?: string | null;
    restaurantId?: string | null;
    requestId?: string | null;
    path?: string | null;
    method?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<void> {
    await this.observability.record({
      source: 'backend',
      category: 'audit',
      level: input.result === 'failed' ? 'error' : 'info',
      event: input.event,
      message: input.message,
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      restaurantId: input.restaurantId ?? null,
      requestId: input.requestId ?? null,
      path: input.path ?? null,
      method: input.method ?? null,
      metadata: {
        actorRoles: input.actorRoles ?? [],
        result: input.result ?? 'succeeded',
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        changedFields: input.changedFields ?? [],
        ...(isObject(input.metadata) ? input.metadata : {}),
      },
    });
  }
}

function isObject(value: Prisma.InputJsonValue | null | undefined): value is Prisma.InputJsonObject {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}
