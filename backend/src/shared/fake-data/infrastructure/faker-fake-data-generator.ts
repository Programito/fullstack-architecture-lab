import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';

import type { FakeDataGenerator } from '../fake-data-generator.port';

@Injectable()
export class FakerFakeDataGenerator implements FakeDataGenerator {
  constructor(private readonly config: ConfigService) {
    if (this.config.get<string>('IDENTITY_MEMORY_SEED_RANDOM') !== 'true') {
      faker.seed(this.getSeedValue());
    }
  }

  personName(): string {
    return faker.person.fullName();
  }

  email(firstName?: string, lastName?: string): string {
    return faker.internet.email({ firstName, lastName }).toLowerCase();
  }

  password(): string {
    return faker.internet.password({ length: 12, memorable: true });
  }

  roleDescription(roleName: string): string {
    return `${capitalize(roleName)} access generated for local development.`;
  }

  private getSeedValue(): number {
    const rawSeed = this.config.get<string>('IDENTITY_MEMORY_SEED_VALUE') ?? '12345';
    const seed = Number.parseInt(rawSeed, 10);

    return Number.isNaN(seed) ? 12345 : seed;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
