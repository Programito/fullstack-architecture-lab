import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PASSWORD_HASHER, type PasswordHasher } from '../src/identity/application/ports/password-hasher.port';
import { ROLE_REPOSITORY } from '../src/identity/application/ports/role-repository.port';
import { USER_REPOSITORY } from '../src/identity/application/ports/user-repository.port';
import { DEMO_ACCOUNT_CATALOG } from '../src/identity/domain/demo-account-catalog';
import { ROLE_CATALOG } from '../src/identity/domain/role-catalog';
import { Role } from '../src/identity/domain/role.entity';
import { InMemoryRoleRepository } from '../src/identity/infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from '../src/identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryAuthSessionRepository } from '../src/identity/infrastructure/persistence/in-memory-auth-session.repository';
import { InMemoryPermissionRepository } from '../src/identity/infrastructure/persistence/in-memory-permission.repository';
import { InMemoryUserRoleAssignmentRepository } from '../src/identity/infrastructure/persistence/in-memory-user-role-assignment.repository';
import { InMemoryIdentitySeed } from '../src/identity/infrastructure/seed/in-memory-identity.seed';
import { ObservabilityService } from '../src/observability/application/observability.service';
import { EVENT_BUS } from '../src/shared/events/event-bus.port';
import { InMemoryEventBus } from '../src/shared/events/in-memory-event-bus';
import { RESTAURANT_ORDER_CATALOG_REPOSITORY } from '../src/restaurants/application/ports/restaurant-order-catalog-repository.port';
import type { RestaurantOrderCatalogRepository } from '../src/restaurants/application/ports/restaurant-order-catalog-repository.port';
import { RESTAURANT_ORDER_REPOSITORY } from '../src/restaurants/application/ports/restaurant-order-repository.port';
import type { RestaurantOrderRepository } from '../src/restaurants/application/ports/restaurant-order-repository.port';
import { RESTAURANT_MENU_ADMIN_REPOSITORY } from '../src/restaurants/application/ports/restaurant-menu-admin-repository.port';
import { RESTAURANT_READ_REPOSITORY } from '../src/restaurants/application/ports/restaurant-read-repository.port';
import { RESTAURANT_SERVICE_WINDOWS_REPOSITORY } from '../src/restaurants/application/ports/restaurant-service-windows-repository.port';
import { CUSTOMER_REPOSITORY } from '../src/restaurants/application/ports/customer-repository.port';
import { DemoRestaurantReadRepository } from '../src/restaurants/infrastructure/demo-restaurant-read.repository';
import { TIME_TRACKING_REPOSITORY } from '../src/time-tracking/application/ports/time-tracking-repository.port';
import { InMemoryTimeTrackingRepository } from '../src/time-tracking/infrastructure/persistence/in-memory-time-tracking.repository';

class TestPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

let e2eRoleRepository: InMemoryRoleRepository | null = null;
const DEMO_RESTAURANT_ID = 'restaurant-mesaflow-centro';

const IN_MEMORY_PRODUCTS = [
  {
    id: 'restaurant-product-burger',
    productId: 'product-burger',
    name: 'Hamburguesa craft',
    displayName: 'Hamburguesa craft',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/hamburguesa-craft.jpg',
    modifierGroupIds: [],
    productType: 'simple' as const,
    course: 'main' as const,
    preparationRoute: 'kitchen' as const,
    priceCents: 1250,
    currency: 'EUR',
    isAvailable: true,
    isVisible: true,
  },
];

const IN_MEMORY_CUSTOMERS = [
  {
    id: 'customer-laura',
    name: 'Laura Gomez',
    phone: '+34 600 111 222',
    email: null,
    visitCount: 3,
    noShowCount: 0,
    cancelCount: 0,
    lateCount: 0,
  },
];

const inMemoryMenuAdminRepository = {
  async listRestaurantProducts(restaurantId: string) {
    return restaurantId === DEMO_RESTAURANT_ID ? IN_MEMORY_PRODUCTS : [];
  },
};

const inMemoryCustomerRepository = {
  async searchByRestaurantId(restaurantId: string, q: string) {
    if (restaurantId !== DEMO_RESTAURANT_ID) {
      return null;
    }

    const query = q.trim().toLowerCase();
    if (!query) {
      return IN_MEMORY_CUSTOMERS;
    }

    return IN_MEMORY_CUSTOMERS.filter((customer) => customer.name.toLowerCase().includes(query));
  },
};

class InMemoryObservabilityService {
  private readonly items: Array<Record<string, unknown>> = [];

  clear() {
    this.items.length = 0;
  }

  async record(input: {
    timestamp?: Date;
    source: string;
    category: string;
    level: string;
    event: string;
    message: string;
    requestId?: string | null;
    organizationId?: string | null;
    userId?: string | null;
    restaurantId?: string | null;
    method?: string | null;
    path?: string | null;
    statusCode?: number | null;
    durationMs?: number | null;
    metadata?: unknown;
  }): Promise<void> {
    const timestamp = input.timestamp ?? new Date();
    const metadata = isRecord(input.metadata) ? input.metadata : null;
    this.items.unshift({
      id: `log-${this.items.length + 1}`,
      timestamp: timestamp.toISOString(),
      source: input.source,
      category: input.category,
      level: input.level,
      event: input.event,
      message: input.message,
      path: input.path ?? null,
      method: input.method ?? null,
      statusCode: input.statusCode ?? null,
      durationMs: input.durationMs ?? null,
      userId: input.userId ?? null,
      restaurantId: input.restaurantId ?? null,
      requestId: input.requestId ?? null,
      actorRoles: Array.isArray(metadata?.['actorRoles']) ? metadata['actorRoles'] : [],
      result: typeof metadata?.['result'] === 'string' ? metadata['result'] : null,
      entityType: typeof metadata?.['entityType'] === 'string' ? metadata['entityType'] : null,
      entityId: typeof metadata?.['entityId'] === 'string' ? metadata['entityId'] : null,
      entityLabel: typeof metadata?.['entityLabel'] === 'string' ? metadata['entityLabel'] : null,
      changedFields: Array.isArray(metadata?.['changedFields']) ? metadata['changedFields'] : [],
      metadata,
    });
  }

  async getSummary() {
    return {
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
      auditEvents: this.items.filter((item) => item['category'] === 'audit').length,
      p95DurationMs: 0,
    };
  }

  async getTimeline() {
    return [];
  }

  async getBreakdown() {
    return { levels: [], categories: [] };
  }

  async listEntityOptions(entityType: string, restaurantId?: string, restrictToUserIds?: string[]) {
    const seen = new Map<string, string>();
    for (const item of this.items) {
      if (item['category'] !== 'audit') continue;
      if (item['entityType'] !== entityType) continue;
      if (restaurantId && item['restaurantId'] !== restaurantId) continue;
      if (restrictToUserIds) {
        const userId = item['userId'];
        if (userId !== null && !restrictToUserIds.includes(userId as string)) continue;
      }
      const entityId = item['entityId'];
      if (typeof entityId !== 'string') continue;
      const entityLabel = typeof item['entityLabel'] === 'string' ? item['entityLabel'] : entityId;
      if (!seen.has(entityId)) seen.set(entityId, entityLabel);
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }

  async listActorOptions(restrictToUserIds?: string[]) {
    const seen = new Map<string, string>();
    for (const item of this.items) {
      if (item['category'] !== 'audit') continue;
      if (item['entityType'] !== 'auth') continue;
      const userId = item['userId'];
      if (typeof userId !== 'string') continue;
      if (restrictToUserIds && !restrictToUserIds.includes(userId)) continue;
      const label = typeof item['entityLabel'] === 'string' ? item['entityLabel'] : userId;
      if (!seen.has(userId)) seen.set(userId, label);
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }

  async listEvents(query: {
    category?: string;
    actorUserId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    result?: string;
    search?: string;
    restrictToUserIds?: string[];
    page: number;
    pageSize: number;
  }) {
    const actorUserId = query.actorUserId ?? query.userId;
    const search = query.search?.toLowerCase() ?? null;
    const filtered = this.items.filter((item) => {
      if (query.category && item['category'] !== query.category) return false;
      if (actorUserId && item['userId'] !== actorUserId) return false;
      if (query.entityType && item['entityType'] !== query.entityType) return false;
      if (query.entityId && item['entityId'] !== query.entityId) return false;
      if (query.result && item['result'] !== query.result) return false;
      if (query.restrictToUserIds) {
        const userId = item['userId'];
        if (userId !== null && !query.restrictToUserIds.includes(userId as string)) return false;
      }
      if (search) {
        const haystack = [item['event'], item['message'], item['path'], item['entityLabel']]
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.toLowerCase());
        if (!haystack.some((value) => value.includes(search))) return false;
      }
      return true;
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      total: filtered.length,
      items: filtered.slice(start, start + query.pageSize),
    };
  }
}

async function createAndLoginAdmin(app: INestApplication) {
  if (!e2eRoleRepository) {
    throw new Error('Expected e2e role repository to be initialized.');
  }

  const permissionsResponse = await request(app.getHttpServer())
    .get('/api/v1/permissions')
    .expect(200);
  const adminRole = Role.create({
    name: 'admin',
    permissionIds: permissionsResponse.body.map((permission: { id: string }) => permission.id),
  });
  await e2eRoleRepository.save(adminRole);

  await request(app.getHttpServer())
    .post('/api/v1/users')
    .send({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'supersecret',
      roleIds: [adminRole.id],
    })
    .expect(201);

  return request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'supersecret' })
    .expect(200);
}

async function createAndLoginOrganizationScopedUser(app: INestApplication) {
  if (!e2eRoleRepository) {
    throw new Error('Expected e2e role repository to be initialized.');
  }

  const developerRole = Role.create({ name: 'developer', permissionIds: [] });
  await e2eRoleRepository.save(developerRole);

  await request(app.getHttpServer())
    .post('/api/v1/users')
    .send({
      email: 'org-scoped@example.com',
      firstName: 'Org',
      lastName: 'Scoped',
      password: 'supersecret',
      roleIds: [developerRole.id],
    })
    .expect(201);

  return request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'org-scoped@example.com', password: 'supersecret' })
    .expect(200);
}

describe('App e2e', () => {
  let app: INestApplication;
  let userRepository: InMemoryUserRepository;
  let roleRepository: InMemoryRoleRepository;
  let eventBus: InMemoryEventBus;
  let sessionRepository: InMemoryAuthSessionRepository;
  let demoReadRepo: DemoRestaurantReadRepository;
  let observability: InMemoryObservabilityService;
  let timeTrackingRepository: InMemoryTimeTrackingRepository;

  beforeAll(async () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:4200';
    process.env.IDENTITY_PERSISTENCE = 'memory';
    process.env.IDENTITY_MEMORY_SEED = 'false';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
    userRepository = new InMemoryUserRepository();
    roleRepository = new InMemoryRoleRepository();
    e2eRoleRepository = roleRepository;
    eventBus = new InMemoryEventBus();
    demoReadRepo = new DemoRestaurantReadRepository();
    observability = new InMemoryObservabilityService();
    timeTrackingRepository = new InMemoryTimeTrackingRepository(userRepository);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(userRepository)
      .overrideProvider(ROLE_REPOSITORY)
      .useValue(roleRepository)
      .overrideProvider(PASSWORD_HASHER)
      .useValue(new TestPasswordHasher())
      .overrideProvider(ObservabilityService)
      .useValue(observability)
      .overrideProvider(EVENT_BUS)
      .useValue(eventBus)
      .overrideProvider(TIME_TRACKING_REPOSITORY)
      .useValue(timeTrackingRepository)
      .overrideProvider(RESTAURANT_ORDER_CATALOG_REPOSITORY)
      .useValue({
        findActiveMenu: async (restaurantId: string) => {
          if (restaurantId !== 'restaurant-mesaflow-centro') return null;
          return {
            restaurantId: 'restaurant-mesaflow-centro',
            name: 'Carta principal',
            isActive: true,
            sections: [
              { id: 'section-drinks', name: 'Bebidas', sortOrder: 1, isVisible: true, items: [] },
              { id: 'section-mains', name: 'Principales', sortOrder: 2, isVisible: true, items: [] },
            ],
          };
        },
      } satisfies RestaurantOrderCatalogRepository)
      .overrideProvider(RESTAURANT_ORDER_REPOSITORY)
      .useValue({
        tableExists: async () => false,
        findActiveByTable: async () => null,
        findById: async () => null,
        open: () => Promise.reject(new Error('DB not available in E2E')),
        addLine: () => Promise.reject(new Error('DB not available in E2E')),
        updatePendingLine: () => Promise.reject(new Error('DB not available in E2E')),
        deletePendingLine: () => Promise.reject(new Error('DB not available in E2E')),
        cancelLine: () => Promise.reject(new Error('DB not available in E2E')),
        updateLineStatus: () => Promise.reject(new Error('DB not available in E2E')),
        sendPendingLinesToKitchen: async () => null,
        markActiveLinesServed: async () => null,
        registerPayment: () => Promise.reject(new Error('DB not available in E2E')),
      } satisfies RestaurantOrderRepository)
      .overrideProvider(RESTAURANT_READ_REPOSITORY)
      .useValue(demoReadRepo)
      .overrideProvider(RESTAURANT_SERVICE_WINDOWS_REPOSITORY)
      .useValue(demoReadRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    sessionRepository = app.get(InMemoryAuthSessionRepository);
  }, 60_000);

  beforeEach(() => {
    userRepository.clear();
    roleRepository.clear();
    eventBus.clear();
    sessionRepository.clear();
    demoReadRepo.reset();
    observability.clear();
    timeTrackingRepository.clear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns health status from the versioned API', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });

  it('lists demo restaurants and returns their menu, floors, and reservations through versioned read endpoints', async () => {
    const login = await createAndLoginAdmin(app);
    const restaurantsResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(restaurantsResponse.body).toEqual([
      expect.objectContaining({
        id: 'restaurant-mesaflow-centro',
        name: 'MesaFlow Centro',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
      }),
    ]);

    const [restaurant] = restaurantsResponse.body;
    const menuResponse = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/menu`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(menuResponse.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      name: 'Carta principal',
    });
    expect(menuResponse.body.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Bebidas',
        }),
        expect.objectContaining({
          name: 'Principales',
        }),
      ]),
    );

    const floorsResponse = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/floors`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(floorsResponse.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: expect.arrayContaining([
        expect.objectContaining({
          tableNumber: 1,
          capacity: 2,
        }),
      ]),
    });
    expect(floorsResponse.body.floors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Sala principal',
          rows: 12,
          columns: 16,
        }),
      ]),
    );

    const reservationsResponse = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurant.id}/reservations`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(reservationsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          customerNameSnapshot: 'Laura Gomez',
          partySize: 2,
          status: 'confirmed',
        }),
      ]),
    );
  });

  it('scopes the restaurant list to the caller organization and excludes other tenants', async () => {
    const orgScopedLogin = await createAndLoginOrganizationScopedUser(app);

    const restaurantsResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .set('Authorization', `Bearer ${orgScopedLogin.body.accessToken}`)
      .expect(200);

    expect(restaurantsResponse.body.map((restaurant: { id: string }) => restaurant.id)).toEqual([
      'restaurant-mesaflow-centro',
    ]);
    expect(restaurantsResponse.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'restaurant-other-tenant' })]),
    );
  });

  it('returns 404 for unknown restaurant read endpoints', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/missing/menu')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/missing/floors')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/missing/reservations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('reorders floor elements within a restaurant floor matrix', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .put('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/reorder')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        elements: [
          { id: 'floor-element-1', x: 2, y: 2, width: 2, height: 2, sortOrder: 2 },
          { id: 'floor-element-2', x: 6, y: 2, width: 2, height: 2, sortOrder: 1 },
        ],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      floors: expect.arrayContaining([
        expect.objectContaining({
          id: 'floor-main',
          elements: expect.arrayContaining([
            expect.objectContaining({ id: 'floor-element-1', x: 2, y: 2 }),
            expect.objectContaining({ id: 'floor-element-2', x: 6, y: 2 }),
          ]),
        }),
      ]),
    });

    const floorsResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/floors')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    const updatedElements = floorsResponse.body.floors[0].elements;
    expect(updatedElements.find((element: { id: string }) => element.id === 'floor-element-2')).toMatchObject({
      sortOrder: 1,
      x: 6,
      y: 2,
    });
  });

  it('allows reordering a floor element to the first grid column using zero-based coordinates', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .put('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/reorder')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        elements: [{ id: 'floor-element-5', x: 0, y: 7, width: 3, height: 1, sortOrder: 5 }],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      floors: expect.arrayContaining([
        expect.objectContaining({
          id: 'floor-main',
          elements: expect.arrayContaining([expect.objectContaining({ id: 'floor-element-5', x: 0, y: 7 })]),
        }),
      ]),
    });
  });

  it('returns 404 for missing floor reorder target and 400 for invalid payload', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .put('/api/v1/restaurants/restaurant-mesaflow-centro/floors/missing/elements/reorder')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ elements: [] })
      .expect(404);

    await request(app.getHttpServer())
      .put('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/reorder')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        elements: [{ id: 'floor-element-1', x: -1, y: 1, width: 0, height: 2, sortOrder: 1 }],
      })
      .expect(400);
  });

  it('updates floor metadata for the restaurant matrix', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        name: 'Sala principal renovada',
        rows: 14,
        columns: 18,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      floors: expect.arrayContaining([
        expect.objectContaining({
          id: 'floor-main',
          name: 'Sala principal renovada',
          rows: 14,
          columns: 18,
        }),
      ]),
    });

    const floorsResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/floors')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(floorsResponse.body.floors[0]).toMatchObject({
      id: 'floor-main',
      name: 'Sala principal renovada',
      rows: 14,
      columns: 18,
    });
  });

  it('returns 404 for missing floor metadata target and 400 for invalid floor dimensions', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/floors/missing')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Nueva sala', rows: 10, columns: 10 })
      .expect(404);

    await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: '', rows: 0, columns: 0 })
      .expect(400);
  });

  it('creates a new floor element inside the restaurant matrix', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        type: 'blocked',
        label: 'Zona temporal',
        x: 10,
        y: 9,
        width: 2,
        height: 1,
        sortOrder: 8,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      floors: expect.arrayContaining([
        expect.objectContaining({
          id: 'floor-main',
          elements: expect.arrayContaining([
            expect.objectContaining({
              label: 'Zona temporal',
              type: 'blocked',
              x: 10,
              y: 9,
            }),
          ]),
        }),
      ]),
    });

    const floorsResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/floors')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(floorsResponse.body.floors[0].elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Zona temporal',
          type: 'blocked',
          sortOrder: 8,
        }),
      ]),
    );
  });

  it('creates a restaurant table when the new floor element is a table', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        type: 'table',
        label: 'M8',
        x: 10,
        y: 9,
        width: 2,
        height: 2,
        shape: 'square',
        sortOrder: 8,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: expect.arrayContaining([
        expect.objectContaining({
          tableNumber: 8,
          name: 'M8',
          capacity: 4,
        }),
      ]),
      floors: expect.arrayContaining([
        expect.objectContaining({
          id: 'floor-main',
          elements: expect.arrayContaining([
            expect.objectContaining({
              label: 'M8',
              type: 'table',
              tableId: 'table-8',
              x: 10,
              y: 9,
              width: 2,
              height: 2,
              shape: 'square',
            }),
          ]),
        }),
      ]),
    });
  });

  it('rejects creating a floor element that overlaps another element', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        type: 'blocked',
        label: 'Zona solapada',
        x: 1,
        y: 1,
        width: 2,
        height: 2,
        sortOrder: 8,
      })
      .expect(400);
  });

  it('updates one floor element size through a dedicated endpoint', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/floor-element-1')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        label: 'Mesa terraza 1',
        x: 1,
        y: 1,
        width: 3,
        height: 2,
        shape: 'square',
        capacity: 6,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: expect.arrayContaining([
        expect.objectContaining({
          id: 'table-1',
          name: 'Mesa terraza 1',
          capacity: 6,
        }),
      ]),
      floors: expect.arrayContaining([
        expect.objectContaining({
          id: 'floor-main',
          elements: expect.arrayContaining([
            expect.objectContaining({
              id: 'floor-element-1',
              label: 'Mesa terraza 1',
              width: 3,
              height: 2,
              x: 1,
              y: 1,
            }),
          ]),
        }),
      ]),
    });
  });

  it('rejects updating a floor element into an overlapping position', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/floor-element-1')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        label: 'Mesa solapada',
        x: 5,
        y: 1,
        width: 2,
        height: 2,
        shape: 'square',
        capacity: 4,
      })
      .expect(400);
  });

  it('accepts a floor element anchored at the first grid column using frontend zero-based coordinates', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        type: 'blocked',
        label: 'Esquina',
        x: 0,
        y: 9,
        width: 1,
        height: 1,
        sortOrder: 8,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      floors: expect.arrayContaining([
        expect.objectContaining({
          id: 'floor-main',
          elements: expect.arrayContaining([
            expect.objectContaining({
              label: 'Esquina',
              type: 'blocked',
              x: 0,
              y: 9,
            }),
          ]),
        }),
      ]),
    });
  });

  it('returns 404 for missing floor create target and 400 for invalid element payload', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/floors/missing/elements')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        type: 'blocked',
        label: 'Zona temporal',
        x: 10,
        y: 9,
        width: 2,
        height: 1,
        sortOrder: 8,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        type: 'blocked',
        label: '',
        x: -1,
        y: 9,
        width: 0,
        height: 1,
        sortOrder: 0,
      })
      .expect(400);
  });

  it('returns 404 for missing floor element update target and 400 for invalid element update payload', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/missing')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        label: 'Bar',
        x: 1,
        y: 7,
        width: 1,
        height: 5,
        shape: null,
      })
      .expect(404);

    await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/floor-element-1')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        label: '',
        x: -1,
        y: 1,
        width: 0,
        height: 6,
        shape: null,
        capacity: 0,
      })
      .expect(400);
  });

  it('rejects reordering a floor element into an overlapping position', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .put('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/reorder')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        elements: [
          { id: 'floor-element-1', x: 5, y: 1, width: 2, height: 2, sortOrder: 1 },
          { id: 'floor-element-2', x: 5, y: 1, width: 2, height: 2, sortOrder: 2 },
        ],
      })
      .expect(400);
  });

  it('returns the operational service floor for one restaurant', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-floor')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        restaurantId: 'restaurant-mesaflow-centro',
        floor: expect.objectContaining({
          id: expect.any(String),
          rows: expect.any(Number),
          columns: expect.any(Number),
        }),
        elements: expect.any(Array),
        servicePoints: expect.any(Array),
        totals: expect.objectContaining({
          servicePointCount: expect.any(Number),
          occupiedCount: expect.any(Number),
          openOrderCount: expect.any(Number),
        }),
      }),
    );
  });

  it('returns one service point detail by table id', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-1')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-1' }),
        floorElement: expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          type: expect.any(String),
        }),
        serviceInfo: expect.objectContaining({
          lineCount: expect.any(Number),
          totalCents: expect.any(Number),
          currency: expect.any(String),
          durationMinutes: expect.any(Number),
        }),
      }),
    );
  });

  it('returns the active order detail for a service point', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-3/order')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        order: expect.objectContaining({
          tableId: 'table-3',
          status: expect.any(String),
          totalCents: expect.any(Number),
          currency: expect.any(String),
        }),
        lines: expect.any(Array),
      }),
    );
  });

  it('returns order null when the service point exists but has no open order', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/order')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      order: null,
      lines: [],
    });
  });

  it('occupies one free service point and returns the updated detail', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/occupy')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({
          id: 'stool-1',
          status: 'occupied',
          occupiedAt: expect.any(String),
          serviceStartedAt: expect.any(String),
        }),
        serviceInfo: expect.objectContaining({
          lineCount: 0,
          totalCents: 0,
        }),
      }),
    );

    const detailAfterOccupy = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(detailAfterOccupy.body.table).toEqual(
      expect.objectContaining({
        id: 'stool-1',
        status: 'occupied',
      }),
    );
  });

  it('returns 404 when occupying a missing service point', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/missing/occupy')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(404);
  });

  it('sends one service point order to kitchen and persists the updated statuses', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-3/send-to-kitchen')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({
          id: 'table-3',
          status: 'waiting_kitchen',
        }),
      }),
    );

    const orderResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-3/order')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(orderResponse.body.order).toEqual(
      expect.objectContaining({
        tableId: 'table-3',
        status: 'sent_to_kitchen',
      }),
    );
    expect(orderResponse.body.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'line-burger', status: 'preparing' }),
        expect.objectContaining({ id: 'line-combo', status: 'sent_to_kitchen' }),
      ]),
    );
  });

  it('returns 400 when sending to kitchen without pending lines', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/send-to-kitchen')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(400);
  });

  it('marks one service point order as served and persists the updated statuses', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-3/mark-served')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({
          id: 'table-3',
          status: 'served',
        }),
      }),
    );

    const orderResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-3/order')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(orderResponse.body.order).toEqual(
      expect.objectContaining({
        tableId: 'table-3',
        status: 'served',
      }),
    );
    expect(orderResponse.body.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'line-burger', status: 'served' }),
        expect.objectContaining({ id: 'line-combo', status: 'served' }),
      ]),
    );
  });

  it('returns 400 when marking served without active lines', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/mark-served')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(400);
  });

  it('charges one service point and persists the paid status', async () => {
    const login = await createAndLoginAdmin(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-2/charge')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({
          id: 'table-2',
          status: 'paid',
        }),
      }),
    );

    const detailResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-2')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(detailResponse.body.table).toEqual(expect.objectContaining({ id: 'table-2', status: 'paid' }));

    const orderResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-2/order')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(orderResponse.body).toEqual({
      order: null,
      lines: [],
    });
  });

  it('returns 400 when charging a free service point', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/charge')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(400);
  });

  it('returns 400 when charging an occupied service point without an amount', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/occupy')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/charge')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(400);
  });

  it('returns 400 when charging an already paid service point', async () => {
    const login = await createAndLoginAdmin(app);
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-1/charge')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(400);
  });

  it('creates and lists users without exposing password data', async () => {
    const admin = await createAndLoginAdmin(app);
    const adminToken = admin.body.accessToken;

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: ' STAFF@Example.COM ',
        firstName: ' Staff ',
        lastName: ' User ',
        password: 'supersecret',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      email: 'staff@example.com',
      firstName: 'Staff',
      lastName: 'User',
      enabled: true,
      roles: [],
    });
    expect(createResponse.body.password).toBeUndefined();
    expect(createResponse.body.passwordHash).toBeUndefined();

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const staffEntry = listResponse.body.find((user: { id: string }) => user.id === createResponse.body.id);
    expect(staffEntry).toMatchObject({
      id: createResponse.body.id,
      email: 'staff@example.com',
      firstName: 'Staff',
      lastName: 'User',
      roles: [],
    });
    expect(staffEntry.password).toBeUndefined();
    expect(staffEntry.passwordHash).toBeUndefined();
  });

  it('locks down user and role bootstrap endpoints once the first admin exists', async () => {
    const admin = await createAndLoginAdmin(app);
    const adminToken = admin.body.accessToken;

    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'someone@example.com', firstName: 'Some', lastName: 'One', password: 'supersecret' })
      .expect(401);
    await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .send({ name: 'sneaky' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'waiter@example.com', firstName: 'Waiter', lastName: 'User', password: 'supersecret' })
      .expect(201);
    const waiterLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'waiter@example.com', password: 'supersecret' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${waiterLogin.body.accessToken}`)
      .expect(403);
  });

  it('returns 409 when creating a user with a duplicated normalized email', async () => {
    const admin = await createAndLoginAdmin(app);
    const adminToken = admin.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'staff@example.com',
        firstName: 'Staff',
        lastName: 'User',
        password: 'supersecret',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: ' STAFF@EXAMPLE.COM ',
        firstName: 'Other',
        lastName: 'Staff',
        password: 'supersecret',
      })
      .expect(409);
  });

  it('rejects invalid user payloads', async () => {
    const admin = await createAndLoginAdmin(app);
    const adminToken = admin.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'invalid-email', firstName: 'Admin', lastName: 'User', password: 'supersecret' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'staff@example.com', firstName: 'Admin', lastName: 'User', password: 'short' })
      .expect(400);
  });

  it('creates roles and assigns them to users', async () => {
    const admin = await createAndLoginAdmin(app);
    const adminToken = admin.body.accessToken;

    const roleResponse = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: ' Cashier ', description: 'Cash desk access.' })
      .expect(201);

    expect(roleResponse.body).toMatchObject({
      name: 'cashier',
      description: 'Cash desk access.',
    });

    const userResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'staff@example.com',
        firstName: 'Staff',
        lastName: 'User',
        password: 'supersecret',
      })
      .expect(201);

    const assignResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userResponse.body.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleIds: [roleResponse.body.id] })
      .expect(200);

    expect(assignResponse.body).toMatchObject({
      id: userResponse.body.id,
      roles: [roleResponse.body.id],
    });

    const rolesResponse = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(rolesResponse.body.map((role: { id: string }) => role.id)).toContain(roleResponse.body.id);
  });

  it('assigns a restaurant scope to a user, granting them access to that restaurant only', async () => {
    const admin = await createAndLoginAdmin(app);
    const adminToken = admin.body.accessToken;

    const roleResponse = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'scoped-waiter' })
      .expect(201);

    const userResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'scoped-staff@example.com',
        firstName: 'Scoped',
        lastName: 'Staff',
        password: 'supersecret',
        roleIds: [roleResponse.body.id],
      })
      .expect(201);

    const scopeResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userResponse.body.id}/scope`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: 'org-demo', restaurantId: 'restaurant-mesaflow-centro' })
      .expect(200);
    expect(scopeResponse.body).toMatchObject({ id: userResponse.body.id });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'scoped-staff@example.com', password: 'supersecret' })
      .expect(200);

    const restaurantsResponse = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(restaurantsResponse.body.map((restaurant: { id: string }) => restaurant.id)).toEqual([
      'restaurant-mesaflow-centro',
    ]);
  });

  it('lists permissions, assigns them to a role, includes them in auth/me and invalidates a disabled session immediately', async () => {
    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .send({ name: 'admin' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'supersecret',
        roleIds: [role.body.id],
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'supersecret' })
      .expect(200);
    const firstCookie = login.headers['set-cookie']?.[0];
    expect(firstCookie).toContain('refresh_token=');
    expect(firstCookie).toContain('HttpOnly');
    expect(login.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });

    const permissions = await request(app.getHttpServer()).get('/api/v1/permissions').expect(200);
    expect(permissions.body.map((permission: { name: string }) => permission.name).sort()).toEqual([
      'dashboard',
      'kitchen',
      'layout',
      'menu',
      'reservations',
      'service',
      'time_tracking',
    ]);

    const assignPermissions = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${role.body.id}/permissions`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ permissionIds: permissions.body.map((permission: { id: string }) => permission.id) })
      .expect(200);
    expect(assignPermissions.body.permissions.sort()).toEqual([
      'dashboard',
      'kitchen',
      'layout',
      'menu',
      'reservations',
      'service',
      'time_tracking',
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect({
        userId: login.body.user.id,
        roles: ['admin'],
        permissions: ['service', 'time_tracking', 'menu', 'kitchen', 'layout', 'reservations', 'dashboard'],
        scopes: {
          organizations: ['org-demo'],
          restaurants: ['restaurant-mesaflow-centro'],
        },
      });

    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(200);
    expect(refresh.body.accessToken).not.toBe(login.body.accessToken);
    expect(refresh.body.permissions.sort()).toEqual([
      'dashboard',
      'kitchen',
      'layout',
      'menu',
      'reservations',
      'service',
      'time_tracking',
    ]);

    const sessions = await request(app.getHttpServer())
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${refresh.body.accessToken}`)
      .expect(200);
    expect(sessions.body).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/sessions/${sessions.body[0].id}/enabled`)
      .set('Authorization', `Bearer ${refresh.body.accessToken}`)
      .send({ enabled: false })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refresh.body.accessToken}`)
      .expect(401);
  });

  it('returns the default service windows for the demo restaurant', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-windows')
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Comidas', startTime: '12:00', endTime: '16:30', sortOrder: 1 }),
        expect.objectContaining({ name: 'Cenas', startTime: '20:00', endTime: '23:30', sortOrder: 2 }),
      ]),
    );
  });

  it('returns 404 when fetching service windows for an unknown restaurant', async () => {
    await request(app.getHttpServer()).get('/api/v1/restaurants/missing/service-windows').expect(404);
  });

  it('updates service windows with valid data and requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'staff@mesaflow.app', firstName: 'Staff', lastName: 'User', password: 'StaffSecret123!' })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@mesaflow.app', password: 'StaffSecret123!' })
      .expect(200);

    const accessToken: string = loginResponse.body.accessToken;
    const restaurantId = 'restaurant-mesaflow-centro';

    const updateResponse = await request(app.getHttpServer())
      .put(`/api/v1/restaurants/${restaurantId}/service-windows`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        windows: [
          { name: 'Almuerzo', startTime: '13:00', endTime: '17:00' },
          { name: 'Noche', startTime: '21:00', endTime: '23:00' },
        ],
      })
      .expect(200);

    expect(updateResponse.body).toEqual([
      expect.objectContaining({ name: 'Almuerzo', startTime: '13:00', endTime: '17:00', sortOrder: 1 }),
      expect.objectContaining({ name: 'Noche', startTime: '21:00', endTime: '23:00', sortOrder: 2 }),
    ]);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}/service-windows`)
      .expect(200);

    expect(getResponse.body).toEqual(updateResponse.body);
  });

  it('returns 401 when updating service windows without authentication', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/restaurants/restaurant-mesaflow-centro/service-windows')
      .send({ windows: [{ name: 'Comidas', startTime: '12:00', endTime: '16:30' }] })
      .expect(401);
  });

  it('returns 400 for invalid service windows payload', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'staff@mesaflow.app', firstName: 'Staff', lastName: 'User', password: 'StaffSecret123!' })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@mesaflow.app', password: 'StaffSecret123!' })
      .expect(200);

    const accessToken: string = loginResponse.body.accessToken;
    const restaurantId = 'restaurant-mesaflow-centro';

    await request(app.getHttpServer())
      .put(`/api/v1/restaurants/${restaurantId}/service-windows`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ windows: [{ name: 'Comidas', startTime: '25:00', endTime: '30:00' }] })
      .expect(400);

    await request(app.getHttpServer())
      .put(`/api/v1/restaurants/${restaurantId}/service-windows`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ windows: [{ name: 'Comidas', startTime: '16:30', endTime: '12:00' }] })
      .expect(400);
  });
});

describe('App e2e with in-memory identity seed', () => {
  let app: INestApplication;
  let demoReadRepo: DemoRestaurantReadRepository;
  let observability: InMemoryObservabilityService;
  let timeTrackingRepository: InMemoryTimeTrackingRepository;
  let seededUsers: InMemoryUserRepository;
  let seededRoles: InMemoryRoleRepository;
  let seededPermissions: InMemoryPermissionRepository;
  let seededSessions: InMemoryAuthSessionRepository;
  let seededAssignments: InMemoryUserRoleAssignmentRepository;
  let seededIdentity: InMemoryIdentitySeed;
  let seededUserRepository:
    | {
        findById(id: string): Promise<unknown>;
        findByEmail(email: string): Promise<unknown>;
        findAll(): Promise<unknown[]>;
      }
    | null = null;

  beforeAll(async () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:4200';
    process.env.IDENTITY_PERSISTENCE = 'memory';
    process.env.IDENTITY_MEMORY_SEED = 'true';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
    process.env.IDENTITY_MEMORY_SEED_COUNT = '2';
    process.env.IDENTITY_MEMORY_SEED_RANDOM = 'false';
    process.env.IDENTITY_MEMORY_SEED_VALUE = '12345';
    process.env.DEMO_LOGIN_ENABLED = 'true';
    demoReadRepo = new DemoRestaurantReadRepository();
    observability = new InMemoryObservabilityService();
    timeTrackingRepository = new InMemoryTimeTrackingRepository({
      save: async () => undefined,
      findById: async (id: string) => (seededUserRepository ? seededUserRepository.findById(id) : null),
      findByEmail: async (email: string) => (seededUserRepository ? seededUserRepository.findByEmail(email) : null),
      findAll: async () => (seededUserRepository ? seededUserRepository.findAll() : []),
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PASSWORD_HASHER)
      .useValue(new TestPasswordHasher())
      .overrideProvider(ObservabilityService)
      .useValue(observability)
      .overrideProvider(TIME_TRACKING_REPOSITORY)
      .useValue(timeTrackingRepository)
      .overrideProvider(RESTAURANT_MENU_ADMIN_REPOSITORY)
      .useValue(inMemoryMenuAdminRepository)
      .overrideProvider(CUSTOMER_REPOSITORY)
      .useValue(inMemoryCustomerRepository)
      .overrideProvider(RESTAURANT_READ_REPOSITORY)
      .useValue(demoReadRepo)
      .overrideProvider(RESTAURANT_SERVICE_WINDOWS_REPOSITORY)
      .useValue(demoReadRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    seededUserRepository = app.get(USER_REPOSITORY);
    seededUsers = app.get(InMemoryUserRepository);
    seededRoles = app.get(InMemoryRoleRepository);
    seededPermissions = app.get(InMemoryPermissionRepository);
    seededSessions = app.get(InMemoryAuthSessionRepository);
    seededAssignments = app.get(InMemoryUserRoleAssignmentRepository);
    seededIdentity = app.get(InMemoryIdentitySeed);
  }, 60_000);

  beforeEach(async () => {
    seededUsers.clear();
    seededRoles.clear();
    seededPermissions.clear();
    seededSessions.clear();
    seededAssignments.clear();
    await seededIdentity.onApplicationBootstrap();
    demoReadRepo.reset();
    observability.clear();
    timeTrackingRepository.clear();
  });

  afterAll(async () => {
    await app?.close();
    process.env.IDENTITY_MEMORY_SEED = 'false';
    process.env.DEMO_LOGIN_ENABLED = 'false';
  });

  it('returns seeded users and roles', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' })
      .expect(200);
    const adminToken = login.body.accessToken;

    const permissionsResponse = await request(app.getHttpServer()).get('/api/v1/permissions').expect(200);
    const rolesResponse = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const usersResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(permissionsResponse.body.map((permission: { name: string }) => permission.name).sort()).toEqual([
      'dashboard',
      'kitchen',
      'layout',
      'menu',
      'reservations',
      'service',
      'time_tracking',
    ]);
    expect(rolesResponse.body.map((role: { name: string }) => role.name).sort()).toEqual(
      ROLE_CATALOG.map((role) => role.name).sort(),
    );
    expect(rolesResponse.body.find((role: { name: string; permissions: string[] }) => role.name === 'waiter')?.permissions).toEqual([
      'service',
      'time_tracking',
      'layout',
      'reservations',
    ]);
    expect(usersResponse.body).toHaveLength(DEMO_ACCOUNT_CATALOG.length + 1 + 2);
    expect(usersResponse.body.find((user: { email: string }) => user.email === 'admin@example.com')).toMatchObject({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      accountType: 'regular',
    });
    expect(usersResponse.body[0].password).toBeUndefined();
    expect(usersResponse.body[0].passwordHash).toBeUndefined();
  });

  it('logs in as a demo developer without exposing credentials and returns protected resources', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    expect(login.body.roles).toEqual(['developer']);
    expect(login.body.user.accountType).toBe('demo');
    expect(login.body.user.password).toBeUndefined();
    expect(login.headers['set-cookie']?.join(';')).toContain('developer_access_token=');

    await request(app.getHttpServer())
      .get('/api/v1/auth/developer-resources')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('exposes structured auth audit metadata in developer logs', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    const logsResponse = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/events')
      .query({
        category: 'audit',
        actorUserId: login.body.user.id,
        entityType: 'auth',
        result: 'succeeded',
        search: 'auth.demo-login.succeeded',
        page: 1,
        pageSize: 20,
      })
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(logsResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'auth.demo-login.succeeded',
          category: 'audit',
          entityType: 'auth',
          entityId: login.body.user.id,
          entityLabel: login.body.user.email,
          result: 'succeeded',
          changedFields: expect.arrayContaining(['session']),
        }),
      ]),
    );
  });

  it('audits failed login attempts without leaking the submitted password', async () => {
    const developer = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong-password' })
      .expect(401);

    const logsResponse = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/events')
      .query({
        category: 'audit',
        entityType: 'auth',
        result: 'failed',
        search: 'auth.login.failed',
        page: 1,
        pageSize: 20,
      })
      .set('Authorization', `Bearer ${developer.body.accessToken}`)
      .expect(200);

    expect(logsResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'auth.login.failed',
          category: 'audit',
          entityType: 'auth',
          entityLabel: 'admin@example.com',
          result: 'failed',
        }),
      ]),
    );
    expect(JSON.stringify(logsResponse.body.items)).not.toContain('wrong-password');
  });

  it('audits refresh token reuse after rotation', async () => {
    const developer = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' })
      .expect(200);
    const staleCookie = login.headers['set-cookie']?.[0];

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', staleCookie)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', staleCookie)
      .expect(401);

    const logsResponse = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/events')
      .query({
        category: 'audit',
        entityType: 'auth',
        result: 'failed',
        search: 'auth.refresh.reuse-detected',
        page: 1,
        pageSize: 20,
      })
      .set('Authorization', `Bearer ${developer.body.accessToken}`)
      .expect(200);

    expect(logsResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'auth.refresh.reuse-detected',
          category: 'audit',
          entityType: 'auth',
          result: 'failed',
        }),
      ]),
    );
  });

  it('hides real user activity from a demo developer even when explicitly filtered for', async () => {
    const realLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' })
      .expect(200);
    const realUserId = realLogin.body.user.id;

    const demoDeveloper = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    const unfiltered = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/events')
      .query({ category: 'audit', entityType: 'auth', page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${demoDeveloper.body.accessToken}`)
      .expect(200);
    expect(unfiltered.body.items.some((item: { userId: string | null }) => item.userId === realUserId)).toBe(false);

    const bypassAttempt = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/events')
      .query({ category: 'audit', actorUserId: realUserId, page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${demoDeveloper.body.accessToken}`)
      .expect(200);
    expect(bypassAttempt.body.items).toHaveLength(0);
  });

  it('lists distinct entity options for a given entity type', async () => {
    const developer = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    const options = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/entity-options')
      .query({ entityType: 'auth' })
      .set('Authorization', `Bearer ${developer.body.accessToken}`)
      .expect(200);

    expect(options.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: developer.body.user.id, label: developer.body.user.email }),
      ]),
    );
  });

  it('hides real user entity options from a demo developer', async () => {
    const realLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' })
      .expect(200);

    const demoDeveloper = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    const options = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/entity-options')
      .query({ entityType: 'auth' })
      .set('Authorization', `Bearer ${demoDeveloper.body.accessToken}`)
      .expect(200);

    expect(options.body.some((option: { id: string }) => option.id === realLogin.body.user.id)).toBe(false);
  });

  it('lists actor options derived from auth audit events and hides real actors from a demo developer', async () => {
    const realLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' })
      .expect(200);

    const demoDeveloper = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    const asDeveloper = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/actor-options')
      .set('Authorization', `Bearer ${demoDeveloper.body.accessToken}`)
      .expect(200);

    expect(asDeveloper.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: demoDeveloper.body.user.id, label: demoDeveloper.body.user.email }),
      ]),
    );
    expect(asDeveloper.body.some((option: { id: string }) => option.id === realLogin.body.user.id)).toBe(false);
  });

  it('keeps the actor label as an email after logout instead of falling back to the raw user id', async () => {
    const manager = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'manager' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${manager.body.accessToken}`)
      .expect(204);

    const developer = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    const options = await request(app.getHttpServer())
      .get('/api/v1/developer/logs/actor-options')
      .set('Authorization', `Bearer ${developer.body.accessToken}`)
      .expect(200);

    expect(options.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: manager.body.user.id, label: manager.body.user.email }),
      ]),
    );
  });

  it('rejects a developer logs page size above the allowed maximum', async () => {
    const developer = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/developer/logs/events')
      .query({ page: 1, pageSize: 500 })
      .set('Authorization', `Bearer ${developer.body.accessToken}`)
      .expect(400);
  });

  it('allows reservations access when the token has organization scope for the active restaurant', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/reservations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('allows reservations access when the token has restaurant scope', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/reservations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('allows service-floor access when the token has organization scope for the active restaurant', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-floor')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('allows service-floor access when the token has restaurant scope', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-floor')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('rejects occupying a table for developer demo without restaurant scope', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/occupy')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('allows waiter demo to occupy a table inside its restaurant scope', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/occupy')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(201);
  });

  it('allows a waiter to clock in, list personal entries, and clock out inside the active restaurant', async () => {
    const waiter = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);
    const token = waiter.body.accessToken as string;

    const clockInResponse = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/clock-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clockInAt: '2026-07-07T08:00:00.000Z',
        clockInNote: 'Inicio servicio',
      })
      .expect(201);

    expect(clockInResponse.body).toEqual(
      expect.objectContaining({
        restaurantId: 'restaurant-mesaflow-centro',
        userId: waiter.body.user.id,
        status: 'open',
        clockInNote: 'Inicio servicio',
      }),
    );

    const ownEntries = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(ownEntries.body).toEqual([
      expect.objectContaining({
        id: clockInResponse.body.id,
        userId: waiter.body.user.id,
        status: 'open',
      }),
    ]);

    await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/${clockInResponse.body.id}/clock-out`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        clockOutAt: '2026-07-07T16:00:00.000Z',
        clockOutNote: 'Fin servicio',
      })
      .expect(200);

    const closedEntries = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(closedEntries.body).toEqual([
      expect.objectContaining({
        id: clockInResponse.body.id,
        status: 'closed',
        clockOutNote: 'Fin servicio',
      }),
    ]);
  });

  it('prevents a waiter from opening two concurrent time entries in the same restaurant', async () => {
    const waiter = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);
    const token = waiter.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/clock-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clockInAt: '2026-07-07T08:00:00.000Z',
        clockInNote: 'Inicio servicio',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/clock-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clockInAt: '2026-07-07T09:00:00.000Z',
        clockInNote: 'Segundo intento',
      })
      .expect(409);
  });

  it('restricts team time entry visibility to manager and admin roles', async () => {
    const waiter = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/clock-in')
      .set('Authorization', `Bearer ${waiter.body.accessToken}`)
      .send({
        clockInAt: '2026-07-07T08:00:00.000Z',
        clockInNote: 'Inicio servicio',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/team')
      .set('Authorization', `Bearer ${waiter.body.accessToken}`)
      .expect(403);

    const manager = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'manager' })
      .expect(200);

    const teamEntries = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/team')
      .set('Authorization', `Bearer ${manager.body.accessToken}`)
      .expect(200);

    expect(teamEntries.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: waiter.body.user.id,
          restaurantId: 'restaurant-mesaflow-centro',
        }),
      ]),
    );
  });

  it('lets a worker request a correction and a manager approve it for the active restaurant team', async () => {
    const waiter = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);
    const waiterToken = waiter.body.accessToken as string;

    const clockInResponse = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/clock-in')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({
        clockInAt: '2026-07-07T08:00:00.000Z',
        clockInNote: 'Inicio servicio',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/${clockInResponse.body.id}/clock-out`)
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({
        clockOutAt: '2026-07-07T16:00:00.000Z',
        clockOutNote: 'Fin servicio',
      })
      .expect(200);

    const createRequestResponse = await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/time-entry-change-requests')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({
        timeEntryId: clockInResponse.body.id,
        requestedClockInAt: '2026-07-07T07:55:00.000Z',
        requestedClockOutAt: '2026-07-07T16:05:00.000Z',
        requestedClockInNote: 'Apertura real',
        requestedClockOutNote: 'Cierre real',
        reason: 'Ajuste de horas reales',
      })
      .expect(201);

    const manager = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'manager' })
      .expect(200);

    const pendingRequests = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/time-entry-change-requests')
      .query({ status: 'pending' })
      .set('Authorization', `Bearer ${manager.body.accessToken}`)
      .expect(200);

    expect(pendingRequests.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createRequestResponse.body.id,
          status: 'pending',
          reason: 'Ajuste de horas reales',
        }),
      ]),
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/restaurant-mesaflow-centro/time-entry-change-requests/${createRequestResponse.body.id}/review`)
      .set('Authorization', `Bearer ${manager.body.accessToken}`)
      .send({
        status: 'approved',
        reviewNote: 'Validado',
      })
      .expect(200);

    const teamEntries = await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/time-entries/team')
      .set('Authorization', `Bearer ${manager.body.accessToken}`)
      .expect(200);

    expect(teamEntries.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: clockInResponse.body.id,
          status: 'corrected',
          clockInAt: '2026-07-07T07:55:00.000Z',
          clockOutAt: '2026-07-07T16:05:00.000Z',
        }),
      ]),
    );
  });

  it('returns 401 when fetching products without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/products')
      .expect(401);
  });

  it('returns 401 when fetching a single product without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/products/any-product')
      .expect(401);
  });

  it('returns 401 when fetching customers without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/customers')
      .expect(401);
  });

  it('returns 401 when sending client log events without authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/observability/client-events')
      .send({
        level: 'info',
        event: 'frontend.navigation',
        message: 'Navigation to /developer/logs',
      })
      .expect(401);
  });

  it('returns 401 when creating a menu section without authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/menus/any-menu/sections')
      .send({ name: 'Sección test', isVisible: true })
      .expect(401);
  });

  it('returns 401 when updating a menu section without authentication', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/menus/any-menu/sections/any-section')
      .send({ name: 'Sección test' })
      .expect(401);
  });

  it('returns 401 when deleting a menu section without authentication', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/restaurants/restaurant-mesaflow-centro/menus/any-menu/sections/any-section')
      .expect(401);
  });

  it('returns 401 when reordering menu sections without authentication', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/restaurants/restaurant-mesaflow-centro/menus/any-menu/sections/reorder')
      .send({ items: [] })
      .expect(401);
  });

  it('returns 403 when a waiter tries to create a menu section (no menu permission)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/restaurants/restaurant-mesaflow-centro/menus/any-menu/sections')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Sección test', isVisible: true })
      .expect(403);
  });

  it('returns 403 when a waiter tries to update menu item availability (no menu permission)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'waiter' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/restaurants/restaurant-mesaflow-centro/products/any-product/availability')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ available: true })
      .expect(403);
  });

  it('allows admin to fetch restaurant products', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'admin' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/products')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('allows admin to fetch restaurant customers', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'admin' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/customers')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('accepts client log events from authenticated users', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/observability/client-events')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        level: 'info',
        event: 'frontend.navigation',
        message: 'Navigation to /developer/logs',
        path: '/developer/logs',
      })
      .expect(202);
  });

  it('blocks a demo admin from mutating other users (roles, enabled, account type, scope, creation)', async () => {
    const admin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin1234' })
      .expect(200);
    const adminToken = admin.body.accessToken;

    const roleResponse = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'demo-block-target-role' })
      .expect(201);

    const targetUser = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'demo-block-target@example.com', firstName: 'Target', lastName: 'User', password: 'supersecret' })
      .expect(201);

    const demoAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'admin' })
      .expect(200);
    const demoToken = demoAdmin.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ email: 'demo-created@example.com', firstName: 'Demo', lastName: 'Created', password: 'supersecret' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUser.body.id}/roles`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ roleIds: [roleResponse.body.id] })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUser.body.id}/enabled`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ enabled: false })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUser.body.id}/account-type`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ accountType: 'system' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUser.body.id}/scope`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ organizationId: 'org-demo', restaurantId: 'restaurant-mesaflow-centro' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ name: 'demo-created-role' })
      .expect(403);

    const permissions = await request(app.getHttpServer()).get('/api/v1/permissions').expect(200);
    const permissionId = permissions.body[0].id;

    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${roleResponse.body.id}/permissions`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ permissionIds: [permissionId] })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${roleResponse.body.id}/enabled`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ enabled: false })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/permissions/${permissionId}/enabled`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({ enabled: false })
      .expect(403);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
