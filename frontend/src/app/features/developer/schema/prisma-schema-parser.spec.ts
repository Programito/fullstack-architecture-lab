import { describe, expect, it } from 'vitest';

import { buildDeveloperSchemasFromPrismaSchema } from './prisma-schema-parser';

describe('buildDeveloperSchemasFromPrismaSchema', () => {
  it('extracts mapped table names, scalar fields, and relation labels', () => {
    const schema = `
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  restaurantId String?
  restaurant   Restaurant? @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@map("users")
}

model Restaurant {
  id    String @id @default(uuid())
  name  String
  users User[]

  @@map("restaurants")
}
`;

    const tables = buildDeveloperSchemasFromPrismaSchema(schema);

    expect(tables).toHaveLength(2);
    expect(tables[0]).toEqual(
      expect.objectContaining({
        id: 'users',
        name: 'users',
        feature: 'users',
      }),
    );
    expect(tables[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', primaryKey: true, type: 'String' }),
        expect.objectContaining({ name: 'restaurantId', nullable: true }),
      ]),
    );
    expect(tables[0]?.relations).toEqual([
      expect.objectContaining({
        label: 'users.restaurantId -> restaurants.id',
        reference: 'restaurants.id',
      }),
    ]);
  });
});
