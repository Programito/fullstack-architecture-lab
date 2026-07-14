import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { DomainEvent } from './domain-event';
import type { EventBus } from './event-bus.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutboxEventBus implements EventBus {
  constructor(private readonly prisma: PrismaService) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        id: event.id,
        type: event.type,
        occurredAt: event.occurredAt,
        payload: toPrismaJson(event.payload),
      },
    });
  }

  async publishMany(events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    await this.prisma.outboxEvent.createMany({
      data: events.map((event) => ({
        id: event.id,
        type: event.type,
        occurredAt: event.occurredAt,
        payload: toPrismaJson(event.payload),
      })),
    });
  }
}

function toPrismaJson(payload: Record<string, unknown>): Prisma.InputJsonValue {
  return payload as Prisma.InputJsonValue;
}
