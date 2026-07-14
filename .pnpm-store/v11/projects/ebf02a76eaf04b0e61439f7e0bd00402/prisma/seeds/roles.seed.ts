import type { PrismaClient } from '@prisma/client';

import { ROLE_CATALOG } from '../../src/identity/domain/role-catalog';

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const role of ROLE_CATALOG) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
      },
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const roleIdByName = new Map(roles.map((role) => [role.name, role.id]));
  const permissionIdByName = new Map(permissions.map((permission) => [permission.name, permission.id]));

  for (const role of ROLE_CATALOG) {
    const roleId = roleIdByName.get(role.name);
    if (!roleId) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (role.permissionNames.length > 0) {
      await prisma.rolePermission.createMany({
        data: role.permissionNames
          .map((permissionName) => permissionIdByName.get(permissionName))
          .filter((permissionId): permissionId is string => Boolean(permissionId))
          .map((permissionId) => ({ roleId, permissionId })),
      });
    }
  }
}
