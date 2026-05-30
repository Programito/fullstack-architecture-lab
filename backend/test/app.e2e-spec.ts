import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PASSWORD_HASHER, type PasswordHasher } from '../src/identity/application/ports/password-hasher.port';
import { ROLE_REPOSITORY } from '../src/identity/application/ports/role-repository.port';
import { USER_REPOSITORY } from '../src/identity/application/ports/user-repository.port';
import { InMemoryRoleRepository } from '../src/identity/infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from '../src/identity/infrastructure/persistence/in-memory-user.repository';
import { EVENT_BUS } from '../src/shared/events/event-bus.port';
import { InMemoryEventBus } from '../src/shared/events/in-memory-event-bus';
import { TASK_REPOSITORY } from '../src/tasks/application/ports/task-repository.port';
import { InMemoryTaskRepository } from '../src/tasks/infrastructure/persistence/in-memory-task.repository';

class TestPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

describe('App e2e', () => {
  let app: INestApplication;
  let taskRepository: InMemoryTaskRepository;
  let userRepository: InMemoryUserRepository;
  let roleRepository: InMemoryRoleRepository;
  let eventBus: InMemoryEventBus;

  beforeAll(async () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:4200';
    process.env.IDENTITY_MEMORY_SEED = 'false';
    taskRepository = new InMemoryTaskRepository();
    userRepository = new InMemoryUserRepository();
    roleRepository = new InMemoryRoleRepository();
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

  beforeEach(() => {
    taskRepository.clear();
    userRepository.clear();
    roleRepository.clear();
    eventBus.clear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns health status from the versioned API', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
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
        name: ' Admin User ',
        password: 'supersecret',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      email: 'admin@example.com',
      name: 'Admin User',
      roles: [],
    });
    expect(createResponse.body.password).toBeUndefined();
    expect(createResponse.body.passwordHash).toBeUndefined();

    const listResponse = await request(app.getHttpServer()).get('/api/v1/users').expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0]).toMatchObject({
      id: createResponse.body.id,
      email: 'admin@example.com',
      name: 'Admin User',
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
        name: 'Admin User',
        password: 'supersecret',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: ' ADMIN@EXAMPLE.COM ',
        name: 'Other Admin',
        password: 'supersecret',
      })
      .expect(409);
  });

  it('rejects invalid user payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'invalid-email', name: 'Admin User', password: 'supersecret' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'admin@example.com', name: 'Admin User', password: 'short' })
      .expect(400);
  });

  it('creates roles and assigns them to users', async () => {
    const roleResponse = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .send({ name: ' Admin ', description: 'Administrative access.' })
      .expect(201);

    expect(roleResponse.body).toMatchObject({
      name: 'admin',
      description: 'Administrative access.',
    });

    const userResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'admin@example.com',
        name: 'Admin User',
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
});

describe('App e2e with in-memory identity seed', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:4200';
    process.env.IDENTITY_MEMORY_SEED = 'true';
    process.env.IDENTITY_MEMORY_SEED_COUNT = '2';
    process.env.IDENTITY_MEMORY_SEED_RANDOM = 'false';
    process.env.IDENTITY_MEMORY_SEED_VALUE = '12345';

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
  });

  it('returns seeded users and roles', async () => {
    const rolesResponse = await request(app.getHttpServer()).get('/api/v1/roles').expect(200);
    const usersResponse = await request(app.getHttpServer()).get('/api/v1/users').expect(200);

    expect(rolesResponse.body.map((role: { name: string }) => role.name)).toEqual(['admin', 'manager', 'user']);
    expect(usersResponse.body).toHaveLength(3);
    expect(usersResponse.body[0]).toMatchObject({
      email: 'admin@example.com',
      name: 'Admin User',
    });
    expect(usersResponse.body[0].password).toBeUndefined();
    expect(usersResponse.body[0].passwordHash).toBeUndefined();
  });
});
