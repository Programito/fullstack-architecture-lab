"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPermissions = seedPermissions;
const permission_catalog_1 = require("../../src/identity/domain/permission-catalog");
async function seedPermissions(prisma) {
    for (const permission of permission_catalog_1.PERMISSION_CATALOG) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: { description: permission.description },
            create: permission,
        });
    }
}
//# sourceMappingURL=permissions.seed.js.map