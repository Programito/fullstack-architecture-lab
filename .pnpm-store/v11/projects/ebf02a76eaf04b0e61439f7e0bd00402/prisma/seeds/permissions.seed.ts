import type { PrismaClient } from '@prisma/client';

import { PERMISSION_CATALOG } from '../../src/identity/domain/permission-catalog';

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission,
    });
  }
}
