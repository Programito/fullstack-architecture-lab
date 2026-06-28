import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PASSWORD_HASHER, type PasswordHasher } from '../src/identity/application/ports/password-hasher.port';
import { ROLE_REPOSITORY } from '../src/identity/application/ports/role-repository.port';
import { USER_REPOSITORY } from '../src/identity/application/ports/user-repository.port';
import { ROLE_CATALOG } from '../src/identity/domain/role-catalog';
import { Role } from '../src/identity/domain/role.entity';
import { InMemoryRoleRepository } from '../src/identity/infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from '../src/identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryAuthSessionRepository } from '../src/identity/infrastructure/persistence/in-memory-auth-session.repository';
import { EVENT_BUS } from '../src/shared/events/event-bus.port';
import { InMemoryEventBus } from '../src/shared/events/in-memory-event-bus';
import { TASK_REPOSITORY } from '../src/tasks/application/ports/task-repository.port';
import { InMemoryTaskRepository } from '../src/tasks/infrastructure/persistence/in-memory-task.repository';
import { DemoRestaurantReadRepository } from '../src/restaurants/infrastructure/demo-restaurant-read.repository';
import { RESTAURANT_ORDER_CATALOG_REPOSITORY } from '../src/restaurants/application/ports/restaurant-order-catalog-repository.port';
import type { RestaurantOrderCatalogRepository } from '../src/restaurants/application/ports/restaurant-order-catalog-repository.port';
import { RESTAURANT_ORDER_REPOSITORY } from '../src/restaurants/application/ports/restaurant-order-repository.port';
import type { RestaurantOrderRepository } from '../src/restaurants/application/ports/restaurant-order-repository.port';

class TestPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

let e2eRoleRepository: InMemoryRoleRepository | null = null;

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

describe('App e2e', () => {
  let app: INestApplication;
  let taskRepository: InMemoryTaskRepository;
  let userRepository: InMemoryUserRepository;
  let roleRepository: InMemoryRoleRepository;
  let eventBus: InMemoryEventBus;
  let sessionRepository: InMemoryAuthSessionRepository;
  let restaurantReadRepository: DemoRestaurantReadRepository;

  beforeAll(async () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:4200';
    process.env.IDENTITY_PERSISTENCE = 'memory';
    process.env.IDENTITY_MEMORY_SEED = 'false';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
    taskRepository = new InMemoryTaskRepository();
    userRepository = new InMemoryUserRepository();
    roleRepository = new InMemoryRoleRepository();
    e2eRoleRepository = roleRepository;
    eventBus = new InMemoryEventBus();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TASK_REPOSITORY)
      .useValue(taskRepository)
      .overrideProvider(USER_REPOSITORY)
      .useValue(userRepository)
      .overrideProvider(ROLE_REPOSITORY)
      .useValue(roleRepository)
      .overrideProvider(PASSWORD_HASHER)
      .useValue(new TestPasswordHasher())
      .overrideProvider(EVENT_BUS)
      .useValue(eventBus)
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
    restaurantReadRepository = app.get(DemoRestaurantReadRepository);

  }, 60_000);

  beforeEach(() => {
    taskRepository.clear();
    userRepository.clear();
    roleRepository.clear();
    eventBus.clear();
    sessionRepository.clear();
    restaurantReadRepository.reset();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns health status from the versioned API', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });

  it('lists demo restaurants and returns their menu, floors, and reservations through versioned read endpoints', async () => {
    const login = await createAndLoginAdmin(app);
    const restaurantsResponse = await request(app.getHttpServer()).get('/api/v1/restaurants').expect(200);

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

  it('creates, lists and completes tasks through versioned REST endpoints', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .send({ title: 'Crear flujo e2e', description: 'Supertest con Postgres real' })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      title: 'Crear flujo e2e',
      description: 'Supertest con Postgres real',
      status: 'pending',
    });

    const listResponse = await request(app.getHttpServer()).get('/api/v1/tasks').expect(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(createResponse.body.id);

    const completeResponse = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${createResponse.body.id}/complete`)
      .expect(200);

    expect(completeResponse.body).toMatchObject({
      id: createResponse.body.id,
      status: 'completed',
    });
    expect(completeResponse.body.completedAt).toEqual(expect.any(String));
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer()).post('/api/v1/tasks').send({ title: '' }).expect(400);
  });

  it('returns 404 when completing a missing task', async () => {
    await request(app.getHttpServer()).patch('/api/v1/tasks/missing/complete').expect(404);
  });

  it('creates and lists users without exposing password data', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: ' ADMIN@Example.COM ',
        firstName: ' Admin ',
        lastName: ' User ',
        password: 'supersecret',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      enabled: true,
      roles: [],
    });
    expect(createResponse.body.password).toBeUndefined();
    expect(createResponse.body.passwordHash).toBeUndefined();

    const listResponse = await request(app.getHttpServer()).get('/api/v1/users').expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0]).toMatchObject({
      id: createResponse.body.id,
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      roles: [],
    });
    expect(listResponse.body[0].password).toBeUndefined();
    expect(listResponse.body[0].passwordHash).toBeUndefined();
  });

  it('returns 409 when creating a user with a duplicated normalized email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'supersecret',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: ' ADMIN@EXAMPLE.COM ',
        firstName: 'Other',
        lastName: 'Admin',
        password: 'supersecret',
      })
      .expect(409);
  });

  it('rejects invalid user payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'invalid-email', firstName: 'Admin', lastName: 'User', password: 'supersecret' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'admin@example.com', firstName: 'Admin', lastName: 'User', password: 'short' })
      .expect(400);
  });

  it('creates roles and assigns them to users', async () => {
    const roleResponse = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .send({ name: ' Cashier ', description: 'Cash desk access.' })
      .expect(201);

    expect(roleResponse.body).toMatchObject({
      name: 'cashier',
      description: 'Cash desk access.',
    });

    const userResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'supersecret',
      })
      .expect(201);

    const assignResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userResponse.body.id}/roles`)
      .send({ roleIds: [roleResponse.body.id] })
      .expect(200);

    expect(assignResponse.body).toMatchObject({
      id: userResponse.body.id,
      roles: [roleResponse.body.id],
    });

    const rolesResponse = await request(app.getHttpServer()).get('/api/v1/roles').expect(200);
    expect(rolesResponse.body).toHaveLength(1);
    expect(rolesResponse.body[0].id).toBe(roleResponse.body.id);
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
      'kitchen',
      'layout',
      'menu',
      'reservations',
      'service',
    ]);

    const assignPermissions = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${role.body.id}/permissions`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ permissionIds: permissions.body.map((permission: { id: string }) => permission.id) })
      .expect(200);
    expect(assignPermissions.body.permissions.sort()).toEqual(['kitchen', 'layout', 'menu', 'reservations', 'service']);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect({
        userId: login.body.user.id,
        roles: ['admin'],
        permissions: ['service', 'menu', 'kitchen', 'layout', 'reservations'],
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
    expect(refresh.body.permissions.sort()).toEqual(['kitchen', 'layout', 'menu', 'reservations', 'service']);

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

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PASSWORD_HASHER)
      .useValue(new TestPasswordHasher())
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
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    process.env.IDENTITY_MEMORY_SEED = 'false';
    process.env.DEMO_LOGIN_ENABLED = 'false';
  });

  it('returns seeded users and roles', async () => {
    const permissionsResponse = await request(app.getHttpServer()).get('/api/v1/permissions').expect(200);
    const rolesResponse = await request(app.getHttpServer()).get('/api/v1/roles').expect(200);
    const usersResponse = await request(app.getHttpServer()).get('/api/v1/users').expect(200);

    expect(permissionsResponse.body.map((permission: { name: string }) => permission.name).sort()).toEqual([
      'kitchen',
      'layout',
      'menu',
      'reservations',
      'service',
    ]);
    expect(rolesResponse.body.map((role: { name: string }) => role.name).sort()).toEqual(
      ROLE_CATALOG.map((role) => role.name).sort(),
    );
    expect(rolesResponse.body.find((role: { name: string; permissions: string[] }) => role.name === 'waiter')?.permissions).toEqual([
      'service',
      'layout',
      'reservations',
    ]);
    expect(usersResponse.body).toHaveLength(8);
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

  it('rejects reservations access when the token lacks restaurant scope', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/reservations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
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

  it('rejects service-floor access when the token lacks restaurant scope', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .send({ role: 'developer' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-floor')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
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
});
