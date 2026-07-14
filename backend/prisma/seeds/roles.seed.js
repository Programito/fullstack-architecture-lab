"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRoles = seedRoles;
const role_catalog_1 = require("../../src/identity/domain/role-catalog");
async function seedRoles(prisma) {
    for (const role of role_catalog_1.ROLE_CATALOG) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: { description: role.description },
            create: {
                name: role.name,
                description: role.description,
            },
        });
    }
    const [roles, permissions] = await Promise.all([
        prisma.role.findMany(),
        prisma.permission.findMany(),
    ]);
    const roleIdByName = new Map(roles.map((role) => [role.name, role.id]));
    const permissionIdByName = new Map(permissions.map((permission) => [permission.name, permission.id]));
    for (const role of role_catalog_1.ROLE_CATALOG) {
        const roleId = roleIdByName.get(role.name);
        if (!roleId)
            continue;
        await prisma.rolePermission.deleteMany({ where: { roleId } });
        if (role.permissionNames.length > 0) {
            await prisma.rolePermission.createMany({
                data: role.permissionNames
                    .map((permissionName) => permissionIdByName.get(permissionName))
                    .filter((permissionId) => Boolean(permissionId))
                    .map((permissionId) => ({ roleId, permissionId })),
            });
        }
    }
}
//# sourceMappingURL=roles.seed.js.map