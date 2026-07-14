export const FAKE_DATA_GENERATOR = Symbol('FAKE_DATA_GENERATOR');

export interface FakeDataGenerator {
  personName(): string;
  email(firstName?: string, lastName?: string): string;
  password(): string;
  roleDescription(roleName: string): string;
}
