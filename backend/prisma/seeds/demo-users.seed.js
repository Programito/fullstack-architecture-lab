"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoUsers = seedDemoUsers;
const bcryptjs_1 = require("bcryptjs");
const demo_account_catalog_1 = require("../../src/identity/domain/demo-account-catalog");
const mesaflow_demo_seed_1 = require("./mesaflow-demo.seed");
async function seedDemoUsers(prisma) {
    const roles = await prisma.role.findMany({
        where: { name: { in: demo_account_catalog_1.DEMO_ACCOUNT_CATALOG.map((account) => account.role) } },
    });
    const organization = await prisma.organization.findUnique({
        where: { name: mesaflow_demo_seed_1.MESAFLOW_DEMO_ORGANIZATION_NAME },
    });
    const restaurant = organization
        ? await prisma.restaurant.findFirst({
            where: {
                organizationId: organization.id,
                name: mesaflow_demo_seed_1.MESAFLOW_DEMO_RESTAURANT_NAME,
            },
        })
        : null;
    if (!organization || !restaurant) {
        throw new Error('MesaFlow demo tenant must exist before demo users are seeded.');
    }
    const roleIdByName = new Map(roles.map((role) => [role.name, role.id]));
    const passwordHash = await (0, bcryptjs_1.hash)(demo_account_catalog_1.DEMO_ACCOUNT_PASSWORD, 12);
    for (const account of demo_account_catalog_1.DEMO_ACCOUNT_CATALOG) {
        const roleId = roleIdByName.get(account.role);
        if (!roleId)
            throw new Error(`Missing demo role "${account.role}".`);
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
                            scopeType: 'organization',
                            organizationId: organization.id,
                            restaurantId: null,
                        },
                    ]
                    : []),
                {
                    userId: user.id,
                    roleId,
                    scopeType: 'restaurant',
                    organizationId: organization.id,
                    restaurantId: restaurant.id,
                },
            ],
        });
    }
}
//# sourceMappingURL=demo-users.seed.js.map