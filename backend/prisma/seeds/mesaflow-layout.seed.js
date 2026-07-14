"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMesaFlowLayoutDemo = seedMesaFlowLayoutDemo;
const mesaflow_demo_seed_1 = require("./mesaflow-demo.seed");
async function seedMesaFlowLayoutDemo(prisma) {
    const organization = await prisma.organization.findUnique({
        where: { name: mesaflow_demo_seed_1.MESAFLOW_DEMO_ORGANIZATION_NAME },
    });
    if (!organization) {
        throw new Error('MesaFlow demo organization must exist before layout is seeded.');
    }
    const restaurant = await prisma.restaurant.findFirst({
        where: {
            organizationId: organization.id,
            name: mesaflow_demo_seed_1.MESAFLOW_DEMO_RESTAURANT_NAME,
        },
    });
    if (!restaurant) {
        throw new Error('MesaFlow demo restaurant must exist before layout is seeded.');
    }
    const floor = await prisma.restaurantFloor.upsert({
        where: {
            restaurantId_name: {
                restaurantId: restaurant.id,
                name: 'Sala principal',
            },
        },
        update: {
            rows: 12,
            columns: 16,
        },
        create: {
            restaurantId: restaurant.id,
            name: 'Sala principal',
            rows: 12,
            columns: 16,
        },
    });
    const tableIdByLabel = new Map();
    for (const table of [
        { tableNumber: 1, id: 'table-1', name: 'Mesa 1', capacity: 2 },
        { tableNumber: 2, id: 'table-2', name: 'Mesa 2', capacity: 4 },
        { tableNumber: 3, id: 'table-3', name: 'Mesa 3', capacity: 6 },
        { tableNumber: 4, id: 'table-4', name: 'Mesa 4', capacity: 4 },
        { tableNumber: 5, id: 'stool-1', name: 'Taburete 1', capacity: 1 },
        { tableNumber: 6, id: 'stool-2', name: 'Taburete 2', capacity: 1 },
        { tableNumber: 7, id: 'stool-3', name: 'Taburete 3', capacity: 1 },
    ]) {
        const storedTable = await prisma.restaurantTable.upsert({
            where: {
                restaurantId_tableNumber: {
                    restaurantId: restaurant.id,
                    tableNumber: table.tableNumber,
                },
            },
            update: {
                id: table.id,
                name: table.name,
                capacity: table.capacity,
                isActive: true,
            },
            create: {
                id: table.id,
                restaurantId: restaurant.id,
                tableNumber: table.tableNumber,
                name: table.name,
                capacity: table.capacity,
                isActive: true,
            },
        });
        tableIdByLabel.set(table.name, storedTable.id);
    }
    for (const element of [
        { type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableLabel: 'Mesa 1', shape: 'square', sortOrder: 1 },
        { type: 'table', label: 'M2', x: 5, y: 1, width: 2, height: 2, tableLabel: 'Mesa 2', shape: 'square', sortOrder: 2 },
        { type: 'table', label: 'M3', x: 9, y: 1, width: 2, height: 2, tableLabel: 'Mesa 3', shape: 'rectangle', sortOrder: 3 },
        { type: 'table', label: 'M4', x: 12, y: 4, width: 2, height: 2, tableLabel: 'Mesa 4', shape: 'round', sortOrder: 4 },
        { type: 'bar', label: 'Bar', x: 1, y: 7, width: 3, height: 1, tableLabel: null, shape: null, sortOrder: 5 },
        { type: 'kitchen', label: 'Kitchen', x: 6, y: 7, width: 3, height: 1, tableLabel: null, shape: null, sortOrder: 6 },
        { type: 'entrance', label: 'Entrance', x: 8, y: 0, width: 2, height: 1, tableLabel: null, shape: null, sortOrder: 7 },
        { type: 'stool', label: 'Stool 1', x: 1, y: 5, width: 1, height: 1, tableLabel: 'Taburete 1', shape: 'round', sortOrder: 8 },
        { type: 'stool', label: 'Stool 2', x: 2, y: 5, width: 1, height: 1, tableLabel: 'Taburete 2', shape: 'round', sortOrder: 9 },
        { type: 'stool', label: 'Stool 3', x: 3, y: 5, width: 1, height: 1, tableLabel: 'Taburete 3', shape: 'round', sortOrder: 10 },
        { type: 'bathroom', label: 'Bathroom', x: 13, y: 0, width: 2, height: 2, tableLabel: null, shape: null, sortOrder: 11 },
        { type: 'blocked', label: 'Blocked area', x: 10, y: 9, width: 3, height: 2, tableLabel: null, shape: null, sortOrder: 12 },
    ]) {
        await prisma.floorElement.upsert({
            where: {
                floorId_label: {
                    floorId: floor.id,
                    label: element.label,
                },
            },
            update: {
                type: element.type,
                tableId: element.tableLabel ? (tableIdByLabel.get(element.tableLabel) ?? null) : null,
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                shape: element.shape,
                sortOrder: element.sortOrder,
            },
            create: {
                floorId: floor.id,
                type: element.type,
                tableId: element.tableLabel ? (tableIdByLabel.get(element.tableLabel) ?? null) : null,
                label: element.label,
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                shape: element.shape,
                sortOrder: element.sortOrder,
            },
        });
    }
}
//# sourceMappingURL=mesaflow-layout.seed.js.map