import type { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

import {
  DEMO_ACCOUNT_CATALOG,
  DEMO_ACCOUNT_PASSWORD,
} from '../../src/identity/domain/demo-account-catalog';
import { MESAFLOW_DEMO_ORGANIZATION_NAME, MESAFLOW_DEMO_RESTAURANT_NAME } from './mesaflow-demo.seed';

export async function seedDemoUsers(prisma: PrismaClient): Promise<void> {
  const roles = await prisma.role.findMany({
    where: { name: { in: DEMO_ACCOUNT_CATALOG.map((account) => account.role) } },
  });
  const organization = await prisma.organization.findUnique({
    where: { name: MESAFLOW_DEMO_ORGANIZATION_NAME },
  });
  const restaurant = organization
    ? await prisma.restaurant.findFirst({
        where: {
          organizationId: organization.id,
          name: MESAFLOW_DEMO_RESTAURANT_NAME,
        },
      })
    : null;
  if (!organization || !restaurant) {
    throw new Error('MesaFlow demo tenant must exist before demo users are seeded.');
  }
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
    await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
    const isOrgRole = account.role === 'admin' || account.role === 'manager';
    await prisma.userRoleAssignment.createMany({
      data: [
        ...(isOrgRole
          ? [
              {
                userId: user.id,
                roleId,
                scopeType: 'organization' as const,
                organizationId: organization.id,
                restaurantId: null,
              },
            ]
          : []),
        {
          userId: user.id,
          roleId,
          scopeType: 'restaurant' as const,
          organizationId: organization.id,
          restaurantId: restaurant.id,
        },
      ],
    });
  }
}
