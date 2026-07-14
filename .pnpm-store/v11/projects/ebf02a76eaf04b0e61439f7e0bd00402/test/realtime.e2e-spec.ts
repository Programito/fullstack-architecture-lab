import type { AddressInfo } from 'node:net';

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthSession } from '../src/identity/domain/auth-session.entity';
import { User } from '../src/identity/domain/user.entity';
import { InMemoryAuthSessionRepository } from '../src/identity/infrastructure/persistence/in-memory-auth-session.repository';
import { InMemoryUserRepository } from '../src/identity/infrastructure/persistence/in-memory-user.repository';
import { AuthTokenService } from '../src/identity/infrastructure/security/auth-token.service';
import { ObservabilityModule } from '../src/observability/observability.module';
import { RealtimeModule } from '../src/realtime/realtime.module';
import {
  REALTIME_ORDER_EVENT_PUBLISHER,
  type RealtimeOrderEventPublisher,
} from '../src/restaurants/application/ports/realtime-order-event-publisher.port';
import { PrismaModule } from '../src/shared/prisma/prisma.module';

const RESTAURANT_ID = 'restaurant-mesaflow-centro';
const OTHER_RESTAURANT_ID = 'restaurant-mesaflow-norte';

async function seedIdentity(
  users: InMemoryUserRepository,
  sessions: InMemoryAuthSessionRepository,
  userId: string,
  sessionId: string,
): Promise<void> {
  await users.save(
    User.rehydrate({
      id: userId,
      email: `${userId}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashed',
      enabled: true,
      accountType: 'regular',
      roleIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
  await sessions.save(
    AuthSession.rehydrate({
      id: sessionId,
      userId,
      refreshTokenHash: 'hash',
      enabled: true,
      expiresAt: new Date(Date.now() + 3_600_000),
      absoluteExpiresAt: new Date(Date.now() + 3_600_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

function connectClient(url: string, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${url}/realtime`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function waitForDisconnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve) => socket.on('disconnect', () => resolve()));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Realtime gateway e2e', () => {
  let app: INestApplication;
  let baseUrl: string;
  let tokens: AuthTokenService;
  let publisher: RealtimeOrderEventPublisher;
  let users: InMemoryUserRepository;
  let sessions: InMemoryAuthSessionRepository;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
    process.env.IDENTITY_PERSISTENCE = 'memory';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/proyecto?schema=public';

    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        ObservabilityModule,
        RealtimeModule.register({ enabled: true }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    tokens = app.get(AuthTokenService);
    publisher = app.get(REALTIME_ORDER_EVENT_PUBLISHER);
    users = app.get(InMemoryUserRepository);
    sessions = app.get(InMemoryAuthSessionRepository);

    await seedIdentity(users, sessions, 'user-allowed', 'session-allowed');
    await seedIdentity(users, sessions, 'user-denied', 'session-denied');
    await seedIdentity(users, sessions, 'user-multi', 'session-multi');
    await seedIdentity(users, sessions, 'user-revoked', 'session-revoked');
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('entrega order:invalidated solo a los sockets con scope sobre el restaurante (anti-fuga multi-tenant)', async () => {
    const allowedToken = await tokens.issueAccessToken('user-allowed', 'session-allowed', [], [], {
      organizations: [],
      restaurants: [RESTAURANT_ID],
    });
    const deniedToken = await tokens.issueAccessToken('user-denied', 'session-denied', [], [], {
      organizations: [],
      restaurants: [],
    });

    const allowedClient = await connectClient(baseUrl, allowedToken);
    const deniedClient = await connectClient(baseUrl, deniedToken);

    const receivedByAllowed: unknown[] = [];
    const receivedByDenied: unknown[] = [];
    allowedClient.on('order:invalidated', (payload) => receivedByAllowed.push(payload));
    deniedClient.on('order:invalidated', (payload) => receivedByDenied.push(payload));

    allowedClient.emit('join-restaurant', RESTAURANT_ID);
    deniedClient.emit('join-restaurant', RESTAURANT_ID);
    await wait(200);

    publisher.publishOrderInvalidated({
      restaurantId: RESTAURANT_ID,
      tableId: 'table-1',
      orderId: 'order-1',
      reason: 'order.opened',
    });
    await wait(200);

    expect(receivedByAllowed).toEqual([
      expect.objectContaining({
        restaurantId: RESTAURANT_ID,
        tableId: 'table-1',
        orderId: 'order-1',
        reason: 'order.opened',
      }),
    ]);
    expect(receivedByDenied).toEqual([]);

    allowedClient.close();
    deniedClient.close();
  });

  it('deja de recibir eventos del restaurante anterior tras unirse a uno nuevo', async () => {
    const token = await tokens.issueAccessToken('user-multi', 'session-multi', [], [], {
      organizations: [],
      restaurants: [RESTAURANT_ID, OTHER_RESTAURANT_ID],
    });

    const client = await connectClient(baseUrl, token);
    const received: unknown[] = [];
    client.on('order:invalidated', (payload) => received.push(payload));

    client.emit('join-restaurant', RESTAURANT_ID);
    await wait(200);

    publisher.publishOrderInvalidated({
      restaurantId: RESTAURANT_ID,
      tableId: 'table-1',
      orderId: 'order-1',
      reason: 'order.opened',
    });
    await wait(200);
    expect(received).toHaveLength(1);

    client.emit('join-restaurant', OTHER_RESTAURANT_ID);
    await wait(200);

    publisher.publishOrderInvalidated({
      restaurantId: RESTAURANT_ID,
      tableId: 'table-1',
      orderId: 'order-1',
      reason: 'order.line.created',
    });
    publisher.publishOrderInvalidated({
      restaurantId: OTHER_RESTAURANT_ID,
      tableId: 'table-2',
      orderId: 'order-2',
      reason: 'order.opened',
    });
    await wait(200);

    expect(received).toEqual([
      expect.objectContaining({ restaurantId: RESTAURANT_ID, reason: 'order.opened' }),
      expect.objectContaining({ restaurantId: OTHER_RESTAURANT_ID, reason: 'order.opened' }),
    ]);

    client.close();
  });

  it('desconecta un socket que se conecta sin token', async () => {
    const socket = io(`${baseUrl}/realtime`, {
      auth: { token: '' },
      transports: ['websocket'],
      reconnection: false,
    });

    await waitForDisconnect(socket);
    expect(socket.connected).toBe(false);
    socket.close();
  });

  it('desconecta un socket cuya sesión ya está revocada en el momento de conectar', async () => {
    const session = await sessions.findById('session-revoked');
    session!.setEnabled(false);
    await sessions.save(session!);

    const token = await tokens.issueAccessToken('user-revoked', 'session-revoked', [], [], {
      organizations: [],
      restaurants: [RESTAURANT_ID],
    });
    const socket = io(`${baseUrl}/realtime`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    await waitForDisconnect(socket);
    expect(socket.connected).toBe(false);
    socket.close();
  });
});
