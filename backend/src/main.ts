import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import 'reflect-metadata';

import { AppModule } from './app.module';
import { DeveloperAccessService } from './identity/application/use-cases/developer-access.service';
import { ConfigDrivenIoAdapter } from './realtime/infrastructure/config-driven-io-adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const developerAccess = app.get(DeveloperAccessService);
  const frontendOrigin = config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:4200';

  app.useWebSocketAdapter(new ConfigDrivenIoAdapter(app, frontendOrigin));
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Proyecto API')
    .setDescription('REST API v1 for the Proyecto backend.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer('/api/v1', 'Version 1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  app.use('/developer', async (request: DeveloperRequest, response: DeveloperResponse, next: (error?: unknown) => void) => {
    try {
      await developerAccess.assertAccess(readCookie(request.headers.cookie, 'developer_access_token'));
      next();
    } catch (error) {
      const status = typeof error === 'object' && error && 'getStatus' in error
        ? (error as { getStatus(): number }).getStatus()
        : 401;
      response.status(status).json({ statusCode: status, message: status === 403 ? 'Forbidden' : 'Unauthorized' });
    }
  });
  SwaggerModule.setup('developer/api-docs', app, document);

  const storybookPath = join(process.cwd(), '..', 'frontend', 'storybook-static');
  if (existsSync(storybookPath)) {
    app.useStaticAssets(storybookPath, { prefix: '/developer/storybook/' });
  }
  const architecturePath = join(process.cwd(), '..', 'frontend', 'docs');
  if (existsSync(architecturePath)) {
    app.useStaticAssets(architecturePath, { prefix: '/developer/architecture/' });
  }

  await app.listen(config.get<number>('PORT') ?? 3000);
}

void bootstrap();

type DeveloperRequest = { headers: { cookie?: string } };
type DeveloperResponse = {
  status(code: number): DeveloperResponse;
  json(body: unknown): void;
};

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const [key, ...value] = pair.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}
