import { describe, expect, it } from 'vitest';

import { FakerFakeDataGenerator } from './faker-fake-data-generator';

class TestConfig {
  constructor(private readonly values: Record<string, string>) {}

  get<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

describe('FakerFakeDataGenerator', () => {
  it('generates deterministic values with the same seed', () => {
    const first = new FakerFakeDataGenerator(new TestConfig({ IDENTITY_MEMORY_SEED_VALUE: '12345' }) as never);
    const firstName = first.personName();
    const firstEmail = first.email('Test', 'User');

    const second = new FakerFakeDataGenerator(new TestConfig({ IDENTITY_MEMORY_SEED_VALUE: '12345' }) as never);
    const secondName = second.personName();
    const secondEmail = second.email('Test', 'User');

    expect(secondName).toBe(firstName);
    expect(secondEmail).toBe(firstEmail);
  });

  it('generates valid-looking emails', () => {
    const fakeData = new FakerFakeDataGenerator(new TestConfig({ IDENTITY_MEMORY_SEED_VALUE: '12345' }) as never);

    expect(fakeData.email('Admin', 'User')).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
  });
});
