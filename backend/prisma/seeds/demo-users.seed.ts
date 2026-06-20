import type { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

import {
  DEMO_ACCOUNT_CATALOG,
  DEMO_ACCOUNT_PASSWORD,
} from '../../src/identity/domain/demo-account-catalog';

export async function seedDemoUsers(prisma: PrismaClient): Promise<void> {
  const roles = await prisma.role.findMany({
    where: { name: { in: DEMO_ACCOUNT_CATALOG.map((account) => account.role) } },
  });
  const roleIdByName = new Map(roles.map((role) => [role.name, role.id]));
  const passwordHash = await hash(DEMO_ACCOUNT_PASSWORD, 12);

  for (const account of DEMO_ACCOUNT_CATALOG) {
    const roleId = roleIdByName.get(account.role);
    if (!roleId) throw new Error(`Missing demo role "${account.role}".`);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        firstName: account.firstName,
        lastName: account.lastName,
        passwordHash,
        accountType: 'demo',
        enabled: true,
      },
      create: {
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        passwordHash,
        accountType: 'demo',
      },
    });

    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId } });
  }
}
