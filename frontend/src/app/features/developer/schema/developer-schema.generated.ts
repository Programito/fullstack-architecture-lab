import type { DeveloperSchemaTable } from './prisma-schema-parser';

export const DEVELOPER_TABLE_SCHEMAS: DeveloperSchemaTable[] = [
  {
    "id": "users",
    "name": "users",
    "feature": "users",
    "domain": "identity",
    "description": "Snapshot técnico derivado de Prisma para users.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde users."
      },
      {
        "name": "email",
        "type": "String",
        "nullable": false,
        "description": "Campo email documentado desde users."
      },
      {
        "name": "firstName",
        "type": "String",
        "nullable": false,
        "description": "Campo firstName documentado desde users."
      },
      {
        "name": "lastName",
        "type": "String",
        "nullable": false,
        "description": "Campo lastName documentado desde users."
      },
      {
        "name": "passwordHash",
        "type": "String",
        "nullable": false,
        "description": "Campo passwordHash documentado desde users."
      },
      {
        "name": "enabled",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo enabled documentado desde users."
      },
      {
        "name": "accountType",
        "type": "AccountType",
        "nullable": false,
        "description": "Campo accountType documentado desde users."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde users."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde users."
      }
    ],
    "relations": []
  },
  {
    "id": "roles",
    "name": "roles",
    "feature": "auth",
    "domain": "identity",
    "description": "Snapshot técnico derivado de Prisma para roles.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde roles."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde roles."
      },
      {
        "name": "description",
        "type": "String",
        "nullable": true,
        "description": "Campo description documentado desde roles."
      },
      {
        "name": "enabled",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo enabled documentado desde roles."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde roles."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde roles."
      }
    ],
    "relations": []
  },
  {
    "id": "permissions",
    "name": "permissions",
    "feature": "auth",
    "domain": "identity",
    "description": "Snapshot técnico derivado de Prisma para permissions.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde permissions."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde permissions."
      },
      {
        "name": "description",
        "type": "String",
        "nullable": true,
        "description": "Campo description documentado desde permissions."
      },
      {
        "name": "enabled",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo enabled documentado desde permissions."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde permissions."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde permissions."
      }
    ],
    "relations": []
  },
  {
    "id": "auth_sessions",
    "name": "auth_sessions",
    "feature": "auth",
    "domain": "identity",
    "description": "Snapshot técnico derivado de Prisma para auth_sessions.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde auth_sessions."
      },
      {
        "name": "userId",
        "type": "String",
        "nullable": false,
        "reference": "users.id",
        "description": "Campo userId documentado desde auth_sessions."
      },
      {
        "name": "refreshTokenHash",
        "type": "String",
        "nullable": false,
        "description": "Campo refreshTokenHash documentado desde auth_sessions."
      },
      {
        "name": "enabled",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo enabled documentado desde auth_sessions."
      },
      {
        "name": "expiresAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo expiresAt documentado desde auth_sessions."
      },
      {
        "name": "absoluteExpiresAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo absoluteExpiresAt documentado desde auth_sessions."
      },
      {
        "name": "revokedAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo revokedAt documentado desde auth_sessions."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde auth_sessions."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde auth_sessions."
      }
    ],
    "relations": [
      {
        "source": "auth_sessions.userId",
        "target": "users.id",
        "reference": "users.id",
        "label": "auth_sessions.userId -> users.id"
      }
    ]
  },
  {
    "id": "user_roles",
    "name": "user_roles",
    "feature": "auth",
    "domain": "identity",
    "description": "Snapshot técnico derivado de Prisma para user_roles.",
    "fields": [
      {
        "name": "userId",
        "type": "String",
        "nullable": false,
        "reference": "users.id",
        "description": "Campo userId documentado desde user_roles."
      },
      {
        "name": "roleId",
        "type": "String",
        "nullable": false,
        "reference": "roles.id",
        "description": "Campo roleId documentado desde user_roles."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde user_roles."
      }
    ],
    "relations": [
      {
        "source": "user_roles.userId",
        "target": "users.id",
        "reference": "users.id",
        "label": "user_roles.userId -> users.id"
      },
      {
        "source": "user_roles.roleId",
        "target": "roles.id",
        "reference": "roles.id",
        "label": "user_roles.roleId -> roles.id"
      }
    ]
  },
  {
    "id": "user_role_assignments",
    "name": "user_role_assignments",
    "feature": "auth",
    "domain": "identity",
    "description": "Snapshot técnico derivado de Prisma para user_role_assignments.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde user_role_assignments."
      },
      {
        "name": "userId",
        "type": "String",
        "nullable": false,
        "reference": "users.id",
        "description": "Campo userId documentado desde user_role_assignments."
      },
      {
        "name": "roleId",
        "type": "String",
        "nullable": false,
        "reference": "roles.id",
        "description": "Campo roleId documentado desde user_role_assignments."
      },
      {
        "name": "scopeType",
        "type": "UserRoleAssignmentScopeType",
        "nullable": false,
        "description": "Campo scopeType documentado desde user_role_assignments."
      },
      {
        "name": "organizationId",
        "type": "String",
        "nullable": true,
        "reference": "organizations.id",
        "description": "Campo organizationId documentado desde user_role_assignments."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": true,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde user_role_assignments."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde user_role_assignments."
      }
    ],
    "relations": [
      {
        "source": "user_role_assignments.userId",
        "target": "users.id",
        "reference": "users.id",
        "label": "user_role_assignments.userId -> users.id"
      },
      {
        "source": "user_role_assignments.roleId",
        "target": "roles.id",
        "reference": "roles.id",
        "label": "user_role_assignments.roleId -> roles.id"
      },
      {
        "source": "user_role_assignments.organizationId",
        "target": "organizations.id",
        "reference": "organizations.id",
        "label": "user_role_assignments.organizationId -> organizations.id"
      },
      {
        "source": "user_role_assignments.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "user_role_assignments.restaurantId -> restaurants.id"
      }
    ]
  },
  {
    "id": "role_permissions",
    "name": "role_permissions",
    "feature": "auth",
    "domain": "identity",
    "description": "Snapshot técnico derivado de Prisma para role_permissions.",
    "fields": [
      {
        "name": "roleId",
        "type": "String",
        "nullable": false,
        "reference": "roles.id",
        "description": "Campo roleId documentado desde role_permissions."
      },
      {
        "name": "permissionId",
        "type": "String",
        "nullable": false,
        "reference": "permissions.id",
        "description": "Campo permissionId documentado desde role_permissions."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde role_permissions."
      }
    ],
    "relations": [
      {
        "source": "role_permissions.roleId",
        "target": "roles.id",
        "reference": "roles.id",
        "label": "role_permissions.roleId -> roles.id"
      },
      {
        "source": "role_permissions.permissionId",
        "target": "permissions.id",
        "reference": "permissions.id",
        "label": "role_permissions.permissionId -> permissions.id"
      }
    ]
  },
  {
    "id": "outbox_events",
    "name": "outbox_events",
    "feature": "developer",
    "domain": "platform",
    "description": "Snapshot técnico derivado de Prisma para outbox_events.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde outbox_events."
      },
      {
        "name": "type",
        "type": "String",
        "nullable": false,
        "description": "Campo type documentado desde outbox_events."
      },
      {
        "name": "payload",
        "type": "Json",
        "nullable": false,
        "description": "Campo payload documentado desde outbox_events."
      },
      {
        "name": "occurredAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo occurredAt documentado desde outbox_events."
      },
      {
        "name": "processedAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo processedAt documentado desde outbox_events."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde outbox_events."
      }
    ],
    "relations": []
  },
  {
    "id": "app_logs",
    "name": "app_logs",
    "feature": "developer",
    "domain": "platform",
    "description": "Snapshot técnico derivado de Prisma para app_logs.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde app_logs."
      },
      {
        "name": "timestamp",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo timestamp documentado desde app_logs."
      },
      {
        "name": "source",
        "type": "LogSource",
        "nullable": false,
        "description": "Campo source documentado desde app_logs."
      },
      {
        "name": "category",
        "type": "LogCategory",
        "nullable": false,
        "description": "Campo category documentado desde app_logs."
      },
      {
        "name": "level",
        "type": "LogLevel",
        "nullable": false,
        "description": "Campo level documentado desde app_logs."
      },
      {
        "name": "event",
        "type": "String",
        "nullable": false,
        "description": "Campo event documentado desde app_logs."
      },
      {
        "name": "message",
        "type": "String",
        "nullable": false,
        "description": "Campo message documentado desde app_logs."
      },
      {
        "name": "requestId",
        "type": "String",
        "nullable": true,
        "description": "Campo requestId documentado desde app_logs."
      },
      {
        "name": "organizationId",
        "type": "String",
        "nullable": true,
        "description": "Campo organizationId documentado desde app_logs."
      },
      {
        "name": "userId",
        "type": "String",
        "nullable": true,
        "description": "Campo userId documentado desde app_logs."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": true,
        "description": "Campo restaurantId documentado desde app_logs."
      },
      {
        "name": "method",
        "type": "String",
        "nullable": true,
        "description": "Campo method documentado desde app_logs."
      },
      {
        "name": "path",
        "type": "String",
        "nullable": true,
        "description": "Campo path documentado desde app_logs."
      },
      {
        "name": "statusCode",
        "type": "Int",
        "nullable": true,
        "description": "Campo statusCode documentado desde app_logs."
      },
      {
        "name": "durationMs",
        "type": "Int",
        "nullable": true,
        "description": "Campo durationMs documentado desde app_logs."
      },
      {
        "name": "metadata",
        "type": "Json",
        "nullable": true,
        "description": "Campo metadata documentado desde app_logs."
      }
    ],
    "relations": []
  },
  {
    "id": "organizations",
    "name": "organizations",
    "feature": "platform",
    "domain": "core",
    "description": "Snapshot técnico derivado de Prisma para organizations.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde organizations."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde organizations."
      },
      {
        "name": "legalName",
        "type": "String",
        "nullable": true,
        "description": "Campo legalName documentado desde organizations."
      },
      {
        "name": "taxId",
        "type": "String",
        "nullable": true,
        "description": "Campo taxId documentado desde organizations."
      },
      {
        "name": "accountType",
        "type": "OrganizationAccountType",
        "nullable": false,
        "description": "Campo accountType documentado desde organizations."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde organizations."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde organizations."
      }
    ],
    "relations": []
  },
  {
    "id": "restaurants",
    "name": "restaurants",
    "feature": "restaurants",
    "domain": "operations",
    "description": "Snapshot técnico derivado de Prisma para restaurants.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde restaurants."
      },
      {
        "name": "organizationId",
        "type": "String",
        "nullable": false,
        "reference": "organizations.id",
        "description": "Campo organizationId documentado desde restaurants."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde restaurants."
      },
      {
        "name": "displayName",
        "type": "String",
        "nullable": true,
        "description": "Campo displayName documentado desde restaurants."
      },
      {
        "name": "address",
        "type": "String",
        "nullable": true,
        "description": "Campo address documentado desde restaurants."
      },
      {
        "name": "phone",
        "type": "String",
        "nullable": true,
        "description": "Campo phone documentado desde restaurants."
      },
      {
        "name": "email",
        "type": "String",
        "nullable": true,
        "description": "Campo email documentado desde restaurants."
      },
      {
        "name": "timezone",
        "type": "String",
        "nullable": false,
        "description": "Campo timezone documentado desde restaurants."
      },
      {
        "name": "currency",
        "type": "String",
        "nullable": false,
        "description": "Campo currency documentado desde restaurants."
      },
      {
        "name": "isActive",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isActive documentado desde restaurants."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde restaurants."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde restaurants."
      }
    ],
    "relations": [
      {
        "source": "restaurants.organizationId",
        "target": "organizations.id",
        "reference": "organizations.id",
        "label": "restaurants.organizationId -> organizations.id"
      }
    ]
  },
  {
    "id": "restaurant_service_windows",
    "name": "restaurant_service_windows",
    "feature": "restaurants",
    "domain": "operations",
    "description": "Snapshot técnico derivado de Prisma para restaurant_service_windows.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde restaurant_service_windows."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde restaurant_service_windows."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde restaurant_service_windows."
      },
      {
        "name": "startTime",
        "type": "String",
        "nullable": false,
        "description": "Campo startTime documentado desde restaurant_service_windows."
      },
      {
        "name": "endTime",
        "type": "String",
        "nullable": false,
        "description": "Campo endTime documentado desde restaurant_service_windows."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde restaurant_service_windows."
      },
      {
        "name": "isActive",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isActive documentado desde restaurant_service_windows."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde restaurant_service_windows."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde restaurant_service_windows."
      }
    ],
    "relations": [
      {
        "source": "restaurant_service_windows.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "restaurant_service_windows.restaurantId -> restaurants.id"
      }
    ]
  },
  {
    "id": "tax_rates",
    "name": "tax_rates",
    "feature": "platform",
    "domain": "core",
    "description": "Snapshot técnico derivado de Prisma para tax_rates.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde tax_rates."
      },
      {
        "name": "organizationId",
        "type": "String",
        "nullable": false,
        "reference": "organizations.id",
        "description": "Campo organizationId documentado desde tax_rates."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde tax_rates."
      },
      {
        "name": "ratePercent",
        "type": "Decimal",
        "nullable": false,
        "description": "Campo ratePercent documentado desde tax_rates."
      },
      {
        "name": "isActive",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isActive documentado desde tax_rates."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde tax_rates."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde tax_rates."
      }
    ],
    "relations": [
      {
        "source": "tax_rates.organizationId",
        "target": "organizations.id",
        "reference": "organizations.id",
        "label": "tax_rates.organizationId -> organizations.id"
      }
    ]
  },
  {
    "id": "products",
    "name": "products",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para products.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde products."
      },
      {
        "name": "organizationId",
        "type": "String",
        "nullable": false,
        "reference": "organizations.id",
        "description": "Campo organizationId documentado desde products."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde products."
      },
      {
        "name": "description",
        "type": "String",
        "nullable": true,
        "description": "Campo description documentado desde products."
      },
      {
        "name": "productType",
        "type": "ProductType",
        "nullable": false,
        "description": "Campo productType documentado desde products."
      },
      {
        "name": "defaultCourse",
        "type": "ProductCourse",
        "nullable": false,
        "description": "Campo defaultCourse documentado desde products."
      },
      {
        "name": "defaultPreparationRoute",
        "type": "PreparationRoute",
        "nullable": false,
        "description": "Campo defaultPreparationRoute documentado desde products."
      },
      {
        "name": "taxRateId",
        "type": "String",
        "nullable": true,
        "reference": "tax_rates.id",
        "description": "Campo taxRateId documentado desde products."
      },
      {
        "name": "isActive",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isActive documentado desde products."
      },
      {
        "name": "comboDefinition",
        "type": "ComboDefinition",
        "nullable": true,
        "description": "Campo comboDefinition documentado desde products."
      },
      {
        "name": "platterDefinition",
        "type": "PlatterDefinition",
        "nullable": true,
        "description": "Campo platterDefinition documentado desde products."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde products."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde products."
      }
    ],
    "relations": [
      {
        "source": "products.organizationId",
        "target": "organizations.id",
        "reference": "organizations.id",
        "label": "products.organizationId -> organizations.id"
      },
      {
        "source": "products.taxRateId",
        "target": "tax_rates.id",
        "reference": "tax_rates.id",
        "label": "products.taxRateId -> tax_rates.id"
      }
    ]
  },
  {
    "id": "restaurant_products",
    "name": "restaurant_products",
    "feature": "restaurants",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para restaurant_products.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde restaurant_products."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde restaurant_products."
      },
      {
        "name": "productId",
        "type": "String",
        "nullable": false,
        "reference": "products.id",
        "description": "Campo productId documentado desde restaurant_products."
      },
      {
        "name": "displayName",
        "type": "String",
        "nullable": true,
        "description": "Campo displayName documentado desde restaurant_products."
      },
      {
        "name": "displayDescription",
        "type": "String",
        "nullable": true,
        "description": "Campo displayDescription documentado desde restaurant_products."
      },
      {
        "name": "imageUrl",
        "type": "String",
        "nullable": true,
        "description": "Campo imageUrl documentado desde restaurant_products."
      },
      {
        "name": "priceCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo priceCents documentado desde restaurant_products."
      },
      {
        "name": "currency",
        "type": "String",
        "nullable": false,
        "description": "Campo currency documentado desde restaurant_products."
      },
      {
        "name": "isAvailable",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isAvailable documentado desde restaurant_products."
      },
      {
        "name": "isVisible",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isVisible documentado desde restaurant_products."
      },
      {
        "name": "preparationRouteOverride",
        "type": "PreparationRoute",
        "nullable": true,
        "description": "Campo preparationRouteOverride documentado desde restaurant_products."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde restaurant_products."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde restaurant_products."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde restaurant_products."
      }
    ],
    "relations": [
      {
        "source": "restaurant_products.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "restaurant_products.restaurantId -> restaurants.id"
      },
      {
        "source": "restaurant_products.productId",
        "target": "products.id",
        "reference": "products.id",
        "label": "restaurant_products.productId -> products.id"
      }
    ]
  },
  {
    "id": "restaurant_menus",
    "name": "restaurant_menus",
    "feature": "restaurants",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para restaurant_menus.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde restaurant_menus."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde restaurant_menus."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde restaurant_menus."
      },
      {
        "name": "isActive",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isActive documentado desde restaurant_menus."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde restaurant_menus."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde restaurant_menus."
      }
    ],
    "relations": [
      {
        "source": "restaurant_menus.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "restaurant_menus.restaurantId -> restaurants.id"
      }
    ]
  },
  {
    "id": "menu_sections",
    "name": "menu_sections",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para menu_sections.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde menu_sections."
      },
      {
        "name": "menuId",
        "type": "String",
        "nullable": false,
        "reference": "restaurant_menus.id",
        "description": "Campo menuId documentado desde menu_sections."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde menu_sections."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde menu_sections."
      },
      {
        "name": "isVisible",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isVisible documentado desde menu_sections."
      }
    ],
    "relations": [
      {
        "source": "menu_sections.menuId",
        "target": "restaurant_menus.id",
        "reference": "restaurant_menus.id",
        "label": "menu_sections.menuId -> restaurant_menus.id"
      }
    ]
  },
  {
    "id": "menu_items",
    "name": "menu_items",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para menu_items.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde menu_items."
      },
      {
        "name": "menuSectionId",
        "type": "String",
        "nullable": false,
        "reference": "menu_sections.id",
        "description": "Campo menuSectionId documentado desde menu_items."
      },
      {
        "name": "restaurantProductId",
        "type": "String",
        "nullable": false,
        "reference": "restaurant_products.id",
        "description": "Campo restaurantProductId documentado desde menu_items."
      },
      {
        "name": "displayNameOverride",
        "type": "String",
        "nullable": true,
        "description": "Campo displayNameOverride documentado desde menu_items."
      },
      {
        "name": "priceOverrideCents",
        "type": "Int",
        "nullable": true,
        "description": "Campo priceOverrideCents documentado desde menu_items."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde menu_items."
      },
      {
        "name": "isVisible",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isVisible documentado desde menu_items."
      }
    ],
    "relations": [
      {
        "source": "menu_items.menuSectionId",
        "target": "menu_sections.id",
        "reference": "menu_sections.id",
        "label": "menu_items.menuSectionId -> menu_sections.id"
      },
      {
        "source": "menu_items.restaurantProductId",
        "target": "restaurant_products.id",
        "reference": "restaurant_products.id",
        "label": "menu_items.restaurantProductId -> restaurant_products.id"
      }
    ]
  },
  {
    "id": "modifier_groups",
    "name": "modifier_groups",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para modifier_groups.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde modifier_groups."
      },
      {
        "name": "organizationId",
        "type": "String",
        "nullable": false,
        "reference": "organizations.id",
        "description": "Campo organizationId documentado desde modifier_groups."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde modifier_groups."
      },
      {
        "name": "selectionType",
        "type": "ModifierSelectionType",
        "nullable": false,
        "description": "Campo selectionType documentado desde modifier_groups."
      },
      {
        "name": "minSelections",
        "type": "Int",
        "nullable": false,
        "description": "Campo minSelections documentado desde modifier_groups."
      },
      {
        "name": "maxSelections",
        "type": "Int",
        "nullable": false,
        "description": "Campo maxSelections documentado desde modifier_groups."
      },
      {
        "name": "isRequired",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isRequired documentado desde modifier_groups."
      },
      {
        "name": "scope",
        "type": "ModifierGroupScope",
        "nullable": false,
        "description": "Campo scope documentado desde modifier_groups."
      },
      {
        "name": "ownerRestaurantProductId",
        "type": "String",
        "nullable": true,
        "reference": "restaurant_products.id",
        "description": "Campo ownerRestaurantProductId documentado desde modifier_groups."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde modifier_groups."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde modifier_groups."
      }
    ],
    "relations": [
      {
        "source": "modifier_groups.organizationId",
        "target": "organizations.id",
        "reference": "organizations.id",
        "label": "modifier_groups.organizationId -> organizations.id"
      },
      {
        "source": "modifier_groups.ownerRestaurantProductId",
        "target": "restaurant_products.id",
        "reference": "restaurant_products.id",
        "label": "modifier_groups.ownerRestaurantProductId -> restaurant_products.id"
      }
    ]
  },
  {
    "id": "modifier_options",
    "name": "modifier_options",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para modifier_options.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde modifier_options."
      },
      {
        "name": "modifierGroupId",
        "type": "String",
        "nullable": false,
        "reference": "modifier_groups.id",
        "description": "Campo modifierGroupId documentado desde modifier_options."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde modifier_options."
      },
      {
        "name": "priceDeltaCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo priceDeltaCents documentado desde modifier_options."
      },
      {
        "name": "imageUrl",
        "type": "String",
        "nullable": true,
        "description": "Campo imageUrl documentado desde modifier_options."
      },
      {
        "name": "isAvailable",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isAvailable documentado desde modifier_options."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde modifier_options."
      }
    ],
    "relations": [
      {
        "source": "modifier_options.modifierGroupId",
        "target": "modifier_groups.id",
        "reference": "modifier_groups.id",
        "label": "modifier_options.modifierGroupId -> modifier_groups.id"
      }
    ]
  },
  {
    "id": "restaurant_product_modifier_groups",
    "name": "restaurant_product_modifier_groups",
    "feature": "restaurants",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para restaurant_product_modifier_groups.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde restaurant_product_modifier_groups."
      },
      {
        "name": "restaurantProductId",
        "type": "String",
        "nullable": false,
        "reference": "restaurant_products.id",
        "description": "Campo restaurantProductId documentado desde restaurant_product_modifier_groups."
      },
      {
        "name": "modifierGroupId",
        "type": "String",
        "nullable": false,
        "reference": "modifier_groups.id",
        "description": "Campo modifierGroupId documentado desde restaurant_product_modifier_groups."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde restaurant_product_modifier_groups."
      }
    ],
    "relations": [
      {
        "source": "restaurant_product_modifier_groups.restaurantProductId",
        "target": "restaurant_products.id",
        "reference": "restaurant_products.id",
        "label": "restaurant_product_modifier_groups.restaurantProductId -> restaurant_products.id"
      },
      {
        "source": "restaurant_product_modifier_groups.modifierGroupId",
        "target": "modifier_groups.id",
        "reference": "modifier_groups.id",
        "label": "restaurant_product_modifier_groups.modifierGroupId -> modifier_groups.id"
      }
    ]
  },
  {
    "id": "combo_definitions",
    "name": "combo_definitions",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para combo_definitions.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde combo_definitions."
      },
      {
        "name": "productId",
        "type": "String",
        "nullable": false,
        "reference": "products.id",
        "description": "Campo productId documentado desde combo_definitions."
      },
      {
        "name": "pricingMode",
        "type": "ComboPricingMode",
        "nullable": false,
        "description": "Campo pricingMode documentado desde combo_definitions."
      },
      {
        "name": "basePriceCents",
        "type": "Int",
        "nullable": true,
        "description": "Campo basePriceCents documentado desde combo_definitions."
      }
    ],
    "relations": [
      {
        "source": "combo_definitions.productId",
        "target": "products.id",
        "reference": "products.id",
        "label": "combo_definitions.productId -> products.id"
      }
    ]
  },
  {
    "id": "combo_slots",
    "name": "combo_slots",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para combo_slots.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde combo_slots."
      },
      {
        "name": "comboDefinitionId",
        "type": "String",
        "nullable": false,
        "reference": "combo_definitions.id",
        "description": "Campo comboDefinitionId documentado desde combo_slots."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde combo_slots."
      },
      {
        "name": "minSelections",
        "type": "Int",
        "nullable": false,
        "description": "Campo minSelections documentado desde combo_slots."
      },
      {
        "name": "maxSelections",
        "type": "Int",
        "nullable": false,
        "description": "Campo maxSelections documentado desde combo_slots."
      },
      {
        "name": "isRequired",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isRequired documentado desde combo_slots."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde combo_slots."
      }
    ],
    "relations": [
      {
        "source": "combo_slots.comboDefinitionId",
        "target": "combo_definitions.id",
        "reference": "combo_definitions.id",
        "label": "combo_slots.comboDefinitionId -> combo_definitions.id"
      }
    ]
  },
  {
    "id": "combo_slot_options",
    "name": "combo_slot_options",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para combo_slot_options.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde combo_slot_options."
      },
      {
        "name": "comboSlotId",
        "type": "String",
        "nullable": false,
        "reference": "combo_slots.id",
        "description": "Campo comboSlotId documentado desde combo_slot_options."
      },
      {
        "name": "restaurantProductId",
        "type": "String",
        "nullable": false,
        "reference": "restaurant_products.id",
        "description": "Campo restaurantProductId documentado desde combo_slot_options."
      },
      {
        "name": "supplementPriceCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo supplementPriceCents documentado desde combo_slot_options."
      },
      {
        "name": "isDefault",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isDefault documentado desde combo_slot_options."
      },
      {
        "name": "isAvailable",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isAvailable documentado desde combo_slot_options."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde combo_slot_options."
      }
    ],
    "relations": [
      {
        "source": "combo_slot_options.comboSlotId",
        "target": "combo_slots.id",
        "reference": "combo_slots.id",
        "label": "combo_slot_options.comboSlotId -> combo_slots.id"
      },
      {
        "source": "combo_slot_options.restaurantProductId",
        "target": "restaurant_products.id",
        "reference": "restaurant_products.id",
        "label": "combo_slot_options.restaurantProductId -> restaurant_products.id"
      }
    ]
  },
  {
    "id": "platter_definitions",
    "name": "platter_definitions",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para platter_definitions.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde platter_definitions."
      },
      {
        "name": "productId",
        "type": "String",
        "nullable": false,
        "reference": "products.id",
        "description": "Campo productId documentado desde platter_definitions."
      }
    ],
    "relations": [
      {
        "source": "platter_definitions.productId",
        "target": "products.id",
        "reference": "products.id",
        "label": "platter_definitions.productId -> products.id"
      }
    ]
  },
  {
    "id": "platter_components",
    "name": "platter_components",
    "feature": "catalog",
    "domain": "catalog",
    "description": "Snapshot técnico derivado de Prisma para platter_components.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde platter_components."
      },
      {
        "name": "platterDefinitionId",
        "type": "String",
        "nullable": false,
        "reference": "platter_definitions.id",
        "description": "Campo platterDefinitionId documentado desde platter_components."
      },
      {
        "name": "componentProductId",
        "type": "String",
        "nullable": true,
        "reference": "products.id",
        "description": "Campo componentProductId documentado desde platter_components."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde platter_components."
      },
      {
        "name": "quantity",
        "type": "Int",
        "nullable": true,
        "description": "Campo quantity documentado desde platter_components."
      },
      {
        "name": "isRemovable",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isRemovable documentado desde platter_components."
      },
      {
        "name": "isReplaceable",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isReplaceable documentado desde platter_components."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde platter_components."
      }
    ],
    "relations": [
      {
        "source": "platter_components.platterDefinitionId",
        "target": "platter_definitions.id",
        "reference": "platter_definitions.id",
        "label": "platter_components.platterDefinitionId -> platter_definitions.id"
      },
      {
        "source": "platter_components.componentProductId",
        "target": "products.id",
        "reference": "products.id",
        "label": "platter_components.componentProductId -> products.id"
      }
    ]
  },
  {
    "id": "orders",
    "name": "orders",
    "feature": "orders",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para orders.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde orders."
      },
      {
        "name": "dailyNumber",
        "type": "Int",
        "nullable": false,
        "description": "Campo dailyNumber documentado desde orders."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde orders."
      },
      {
        "name": "tableId",
        "type": "String",
        "nullable": true,
        "reference": "restaurant_tables.id",
        "description": "Campo tableId documentado desde orders."
      },
      {
        "name": "status",
        "type": "OrderStatus",
        "nullable": false,
        "description": "Campo status documentado desde orders."
      },
      {
        "name": "openedByUserId",
        "type": "String",
        "nullable": false,
        "description": "Campo openedByUserId documentado desde orders."
      },
      {
        "name": "currency",
        "type": "String",
        "nullable": false,
        "description": "Campo currency documentado desde orders."
      },
      {
        "name": "guestCount",
        "type": "Int",
        "nullable": false,
        "description": "Campo guestCount documentado desde orders."
      },
      {
        "name": "subtotalCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo subtotalCents documentado desde orders."
      },
      {
        "name": "taxCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo taxCents documentado desde orders."
      },
      {
        "name": "discountTotalCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo discountTotalCents documentado desde orders."
      },
      {
        "name": "totalCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo totalCents documentado desde orders."
      },
      {
        "name": "closedAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo closedAt documentado desde orders."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde orders."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde orders."
      }
    ],
    "relations": [
      {
        "source": "orders.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "orders.restaurantId -> restaurants.id"
      },
      {
        "source": "orders.tableId",
        "target": "restaurant_tables.id",
        "reference": "restaurant_tables.id",
        "label": "orders.tableId -> restaurant_tables.id"
      }
    ]
  },
  {
    "id": "order_lines",
    "name": "order_lines",
    "feature": "orders",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para order_lines.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde order_lines."
      },
      {
        "name": "orderId",
        "type": "String",
        "nullable": false,
        "reference": "orders.id",
        "description": "Campo orderId documentado desde order_lines."
      },
      {
        "name": "restaurantProductId",
        "type": "String",
        "nullable": true,
        "reference": "restaurant_products.id",
        "description": "Campo restaurantProductId documentado desde order_lines."
      },
      {
        "name": "productId",
        "type": "String",
        "nullable": true,
        "reference": "products.id",
        "description": "Campo productId documentado desde order_lines."
      },
      {
        "name": "productNameSnapshot",
        "type": "String",
        "nullable": false,
        "description": "Campo productNameSnapshot documentado desde order_lines."
      },
      {
        "name": "productTypeSnapshot",
        "type": "ProductType",
        "nullable": false,
        "description": "Campo productTypeSnapshot documentado desde order_lines."
      },
      {
        "name": "courseSnapshot",
        "type": "ProductCourse",
        "nullable": false,
        "description": "Campo courseSnapshot documentado desde order_lines."
      },
      {
        "name": "preparationRouteSnapshot",
        "type": "PreparationRoute",
        "nullable": false,
        "description": "Campo preparationRouteSnapshot documentado desde order_lines."
      },
      {
        "name": "basePriceCentsSnapshot",
        "type": "Int",
        "nullable": false,
        "description": "Campo basePriceCentsSnapshot documentado desde order_lines."
      },
      {
        "name": "unitPriceCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo unitPriceCents documentado desde order_lines."
      },
      {
        "name": "quantity",
        "type": "Int",
        "nullable": false,
        "description": "Campo quantity documentado desde order_lines."
      },
      {
        "name": "subtotalCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo subtotalCents documentado desde order_lines."
      },
      {
        "name": "taxRateNameSnapshot",
        "type": "String",
        "nullable": true,
        "description": "Campo taxRateNameSnapshot documentado desde order_lines."
      },
      {
        "name": "taxRatePercentSnapshot",
        "type": "Decimal",
        "nullable": true,
        "description": "Campo taxRatePercentSnapshot documentado desde order_lines."
      },
      {
        "name": "taxCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo taxCents documentado desde order_lines."
      },
      {
        "name": "status",
        "type": "OrderLineStatus",
        "nullable": false,
        "description": "Campo status documentado desde order_lines."
      },
      {
        "name": "kitchenNote",
        "type": "String",
        "nullable": true,
        "description": "Campo kitchenNote documentado desde order_lines."
      },
      {
        "name": "cancellationReason",
        "type": "String",
        "nullable": true,
        "description": "Campo cancellationReason documentado desde order_lines."
      },
      {
        "name": "cancelledAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo cancelledAt documentado desde order_lines."
      },
      {
        "name": "configurationSignature",
        "type": "String",
        "nullable": false,
        "description": "Campo configurationSignature documentado desde order_lines."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde order_lines."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde order_lines."
      }
    ],
    "relations": [
      {
        "source": "order_lines.orderId",
        "target": "orders.id",
        "reference": "orders.id",
        "label": "order_lines.orderId -> orders.id"
      },
      {
        "source": "order_lines.restaurantProductId",
        "target": "restaurant_products.id",
        "reference": "restaurant_products.id",
        "label": "order_lines.restaurantProductId -> restaurant_products.id"
      },
      {
        "source": "order_lines.productId",
        "target": "products.id",
        "reference": "products.id",
        "label": "order_lines.productId -> products.id"
      }
    ]
  },
  {
    "id": "order_line_modifiers",
    "name": "order_line_modifiers",
    "feature": "orders",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para order_line_modifiers.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde order_line_modifiers."
      },
      {
        "name": "orderLineId",
        "type": "String",
        "nullable": false,
        "reference": "order_lines.id",
        "description": "Campo orderLineId documentado desde order_line_modifiers."
      },
      {
        "name": "groupNameSnapshot",
        "type": "String",
        "nullable": false,
        "description": "Campo groupNameSnapshot documentado desde order_line_modifiers."
      },
      {
        "name": "optionNameSnapshot",
        "type": "String",
        "nullable": false,
        "description": "Campo optionNameSnapshot documentado desde order_line_modifiers."
      },
      {
        "name": "priceDeltaCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo priceDeltaCents documentado desde order_line_modifiers."
      },
      {
        "name": "quantity",
        "type": "Int",
        "nullable": false,
        "description": "Campo quantity documentado desde order_line_modifiers."
      }
    ],
    "relations": [
      {
        "source": "order_line_modifiers.orderLineId",
        "target": "order_lines.id",
        "reference": "order_lines.id",
        "label": "order_line_modifiers.orderLineId -> order_lines.id"
      }
    ]
  },
  {
    "id": "order_line_combo_slots",
    "name": "order_line_combo_slots",
    "feature": "orders",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para order_line_combo_slots.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde order_line_combo_slots."
      },
      {
        "name": "orderLineId",
        "type": "String",
        "nullable": false,
        "reference": "order_lines.id",
        "description": "Campo orderLineId documentado desde order_line_combo_slots."
      },
      {
        "name": "slotNameSnapshot",
        "type": "String",
        "nullable": false,
        "description": "Campo slotNameSnapshot documentado desde order_line_combo_slots."
      },
      {
        "name": "selectedProductNameSnapshot",
        "type": "String",
        "nullable": false,
        "description": "Campo selectedProductNameSnapshot documentado desde order_line_combo_slots."
      },
      {
        "name": "supplementPriceCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo supplementPriceCents documentado desde order_line_combo_slots."
      },
      {
        "name": "quantity",
        "type": "Int",
        "nullable": false,
        "description": "Campo quantity documentado desde order_line_combo_slots."
      }
    ],
    "relations": [
      {
        "source": "order_line_combo_slots.orderLineId",
        "target": "order_lines.id",
        "reference": "order_lines.id",
        "label": "order_line_combo_slots.orderLineId -> order_lines.id"
      }
    ]
  },
  {
    "id": "order_line_platter_components",
    "name": "order_line_platter_components",
    "feature": "orders",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para order_line_platter_components.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde order_line_platter_components."
      },
      {
        "name": "orderLineId",
        "type": "String",
        "nullable": false,
        "reference": "order_lines.id",
        "description": "Campo orderLineId documentado desde order_line_platter_components."
      },
      {
        "name": "componentNameSnapshot",
        "type": "String",
        "nullable": false,
        "description": "Campo componentNameSnapshot documentado desde order_line_platter_components."
      },
      {
        "name": "removed",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo removed documentado desde order_line_platter_components."
      },
      {
        "name": "replacementNameSnapshot",
        "type": "String",
        "nullable": true,
        "description": "Campo replacementNameSnapshot documentado desde order_line_platter_components."
      },
      {
        "name": "priceDeltaCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo priceDeltaCents documentado desde order_line_platter_components."
      }
    ],
    "relations": [
      {
        "source": "order_line_platter_components.orderLineId",
        "target": "order_lines.id",
        "reference": "order_lines.id",
        "label": "order_line_platter_components.orderLineId -> order_lines.id"
      }
    ]
  },
  {
    "id": "order_discounts",
    "name": "order_discounts",
    "feature": "orders",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para order_discounts.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde order_discounts."
      },
      {
        "name": "orderId",
        "type": "String",
        "nullable": false,
        "reference": "orders.id",
        "description": "Campo orderId documentado desde order_discounts."
      },
      {
        "name": "type",
        "type": "OrderDiscountType",
        "nullable": false,
        "description": "Campo type documentado desde order_discounts."
      },
      {
        "name": "value",
        "type": "Decimal",
        "nullable": false,
        "description": "Campo value documentado desde order_discounts."
      },
      {
        "name": "reason",
        "type": "String",
        "nullable": true,
        "description": "Campo reason documentado desde order_discounts."
      },
      {
        "name": "createdByUserId",
        "type": "String",
        "nullable": false,
        "reference": "users.id",
        "description": "Campo createdByUserId documentado desde order_discounts."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde order_discounts."
      }
    ],
    "relations": [
      {
        "source": "order_discounts.orderId",
        "target": "orders.id",
        "reference": "orders.id",
        "label": "order_discounts.orderId -> orders.id"
      },
      {
        "source": "order_discounts.createdByUserId",
        "target": "users.id",
        "reference": "users.id",
        "label": "order_discounts.createdByUserId -> users.id"
      }
    ]
  },
  {
    "id": "payments",
    "name": "payments",
    "feature": "orders",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para payments.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde payments."
      },
      {
        "name": "orderId",
        "type": "String",
        "nullable": false,
        "reference": "orders.id",
        "description": "Campo orderId documentado desde payments."
      },
      {
        "name": "method",
        "type": "PaymentMethod",
        "nullable": false,
        "description": "Campo method documentado desde payments."
      },
      {
        "name": "amountCents",
        "type": "Int",
        "nullable": false,
        "description": "Campo amountCents documentado desde payments."
      },
      {
        "name": "status",
        "type": "PaymentStatus",
        "nullable": false,
        "description": "Campo status documentado desde payments."
      },
      {
        "name": "paidAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo paidAt documentado desde payments."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde payments."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde payments."
      }
    ],
    "relations": [
      {
        "source": "payments.orderId",
        "target": "orders.id",
        "reference": "orders.id",
        "label": "payments.orderId -> orders.id"
      }
    ]
  },
  {
    "id": "restaurant_floors",
    "name": "restaurant_floors",
    "feature": "restaurants",
    "domain": "operations",
    "description": "Snapshot técnico derivado de Prisma para restaurant_floors.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde restaurant_floors."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde restaurant_floors."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde restaurant_floors."
      },
      {
        "name": "rows",
        "type": "Int",
        "nullable": false,
        "description": "Campo rows documentado desde restaurant_floors."
      },
      {
        "name": "columns",
        "type": "Int",
        "nullable": false,
        "description": "Campo columns documentado desde restaurant_floors."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde restaurant_floors."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde restaurant_floors."
      }
    ],
    "relations": [
      {
        "source": "restaurant_floors.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "restaurant_floors.restaurantId -> restaurants.id"
      }
    ]
  },
  {
    "id": "restaurant_tables",
    "name": "restaurant_tables",
    "feature": "restaurants",
    "domain": "operations",
    "description": "Snapshot técnico derivado de Prisma para restaurant_tables.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde restaurant_tables."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde restaurant_tables."
      },
      {
        "name": "tableNumber",
        "type": "Int",
        "nullable": false,
        "description": "Campo tableNumber documentado desde restaurant_tables."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": true,
        "description": "Campo name documentado desde restaurant_tables."
      },
      {
        "name": "capacity",
        "type": "Int",
        "nullable": false,
        "description": "Campo capacity documentado desde restaurant_tables."
      },
      {
        "name": "isActive",
        "type": "Boolean",
        "nullable": false,
        "description": "Campo isActive documentado desde restaurant_tables."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde restaurant_tables."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde restaurant_tables."
      }
    ],
    "relations": [
      {
        "source": "restaurant_tables.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "restaurant_tables.restaurantId -> restaurants.id"
      }
    ]
  },
  {
    "id": "floor_elements",
    "name": "floor_elements",
    "feature": "restaurants",
    "domain": "operations",
    "description": "Snapshot técnico derivado de Prisma para floor_elements.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde floor_elements."
      },
      {
        "name": "floorId",
        "type": "String",
        "nullable": false,
        "reference": "restaurant_floors.id",
        "description": "Campo floorId documentado desde floor_elements."
      },
      {
        "name": "type",
        "type": "FloorElementType",
        "nullable": false,
        "description": "Campo type documentado desde floor_elements."
      },
      {
        "name": "tableId",
        "type": "String",
        "nullable": true,
        "reference": "restaurant_tables.id",
        "description": "Campo tableId documentado desde floor_elements."
      },
      {
        "name": "label",
        "type": "String",
        "nullable": false,
        "description": "Campo label documentado desde floor_elements."
      },
      {
        "name": "x",
        "type": "Int",
        "nullable": false,
        "description": "Campo x documentado desde floor_elements."
      },
      {
        "name": "y",
        "type": "Int",
        "nullable": false,
        "description": "Campo y documentado desde floor_elements."
      },
      {
        "name": "width",
        "type": "Int",
        "nullable": false,
        "description": "Campo width documentado desde floor_elements."
      },
      {
        "name": "height",
        "type": "Int",
        "nullable": false,
        "description": "Campo height documentado desde floor_elements."
      },
      {
        "name": "shape",
        "type": "TableShape",
        "nullable": true,
        "description": "Campo shape documentado desde floor_elements."
      },
      {
        "name": "sortOrder",
        "type": "Int",
        "nullable": false,
        "description": "Campo sortOrder documentado desde floor_elements."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde floor_elements."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde floor_elements."
      }
    ],
    "relations": [
      {
        "source": "floor_elements.floorId",
        "target": "restaurant_floors.id",
        "reference": "restaurant_floors.id",
        "label": "floor_elements.floorId -> restaurant_floors.id"
      },
      {
        "source": "floor_elements.tableId",
        "target": "restaurant_tables.id",
        "reference": "restaurant_tables.id",
        "label": "floor_elements.tableId -> restaurant_tables.id"
      }
    ]
  },
  {
    "id": "customers",
    "name": "customers",
    "feature": "platform",
    "domain": "core",
    "description": "Snapshot técnico derivado de Prisma para customers.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde customers."
      },
      {
        "name": "organizationId",
        "type": "String",
        "nullable": false,
        "reference": "organizations.id",
        "description": "Campo organizationId documentado desde customers."
      },
      {
        "name": "name",
        "type": "String",
        "nullable": false,
        "description": "Campo name documentado desde customers."
      },
      {
        "name": "phone",
        "type": "String",
        "nullable": true,
        "description": "Campo phone documentado desde customers."
      },
      {
        "name": "email",
        "type": "String",
        "nullable": true,
        "description": "Campo email documentado desde customers."
      },
      {
        "name": "notes",
        "type": "String",
        "nullable": true,
        "description": "Campo notes documentado desde customers."
      },
      {
        "name": "visitCount",
        "type": "Int",
        "nullable": false,
        "description": "Campo visitCount documentado desde customers."
      },
      {
        "name": "noShowCount",
        "type": "Int",
        "nullable": false,
        "description": "Campo noShowCount documentado desde customers."
      },
      {
        "name": "cancelCount",
        "type": "Int",
        "nullable": false,
        "description": "Campo cancelCount documentado desde customers."
      },
      {
        "name": "lateCount",
        "type": "Int",
        "nullable": false,
        "description": "Campo lateCount documentado desde customers."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde customers."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde customers."
      }
    ],
    "relations": [
      {
        "source": "customers.organizationId",
        "target": "organizations.id",
        "reference": "organizations.id",
        "label": "customers.organizationId -> organizations.id"
      }
    ]
  },
  {
    "id": "reservations",
    "name": "reservations",
    "feature": "restaurants",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para reservations.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde reservations."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde reservations."
      },
      {
        "name": "customerId",
        "type": "String",
        "nullable": true,
        "reference": "customers.id",
        "description": "Campo customerId documentado desde reservations."
      },
      {
        "name": "customerNameSnapshot",
        "type": "String",
        "nullable": false,
        "description": "Campo customerNameSnapshot documentado desde reservations."
      },
      {
        "name": "customerPhoneSnapshot",
        "type": "String",
        "nullable": true,
        "description": "Campo customerPhoneSnapshot documentado desde reservations."
      },
      {
        "name": "partySize",
        "type": "Int",
        "nullable": false,
        "description": "Campo partySize documentado desde reservations."
      },
      {
        "name": "reservationAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo reservationAt documentado desde reservations."
      },
      {
        "name": "durationMinutes",
        "type": "Int",
        "nullable": false,
        "description": "Campo durationMinutes documentado desde reservations."
      },
      {
        "name": "status",
        "type": "ReservationStatus",
        "nullable": false,
        "description": "Campo status documentado desde reservations."
      },
      {
        "name": "arrivedLate",
        "type": "Boolean",
        "nullable": true,
        "description": "Campo arrivedLate documentado desde reservations."
      },
      {
        "name": "notes",
        "type": "String",
        "nullable": true,
        "description": "Campo notes documentado desde reservations."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde reservations."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde reservations."
      }
    ],
    "relations": [
      {
        "source": "reservations.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "reservations.restaurantId -> restaurants.id"
      },
      {
        "source": "reservations.customerId",
        "target": "customers.id",
        "reference": "customers.id",
        "label": "reservations.customerId -> customers.id"
      }
    ]
  },
  {
    "id": "reservation_tables",
    "name": "reservation_tables",
    "feature": "restaurants",
    "domain": "service",
    "description": "Snapshot técnico derivado de Prisma para reservation_tables.",
    "fields": [
      {
        "name": "reservationId",
        "type": "String",
        "nullable": false,
        "reference": "reservations.id",
        "description": "Campo reservationId documentado desde reservation_tables."
      },
      {
        "name": "tableId",
        "type": "String",
        "nullable": false,
        "reference": "restaurant_tables.id",
        "description": "Campo tableId documentado desde reservation_tables."
      }
    ],
    "relations": [
      {
        "source": "reservation_tables.reservationId",
        "target": "reservations.id",
        "reference": "reservations.id",
        "label": "reservation_tables.reservationId -> reservations.id"
      },
      {
        "source": "reservation_tables.tableId",
        "target": "restaurant_tables.id",
        "reference": "restaurant_tables.id",
        "label": "reservation_tables.tableId -> restaurant_tables.id"
      }
    ]
  },
  {
    "id": "time_entries",
    "name": "time_entries",
    "feature": "platform",
    "domain": "core",
    "description": "Snapshot técnico derivado de Prisma para time_entries.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde time_entries."
      },
      {
        "name": "userId",
        "type": "String",
        "nullable": false,
        "description": "Campo userId documentado desde time_entries."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde time_entries."
      },
      {
        "name": "clockInAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo clockInAt documentado desde time_entries."
      },
      {
        "name": "clockOutAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo clockOutAt documentado desde time_entries."
      },
      {
        "name": "clockInNote",
        "type": "String",
        "nullable": true,
        "description": "Campo clockInNote documentado desde time_entries."
      },
      {
        "name": "clockOutNote",
        "type": "String",
        "nullable": true,
        "description": "Campo clockOutNote documentado desde time_entries."
      },
      {
        "name": "status",
        "type": "TimeEntryStatus",
        "nullable": false,
        "description": "Campo status documentado desde time_entries."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde time_entries."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde time_entries."
      }
    ],
    "relations": [
      {
        "source": "time_entries.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "time_entries.restaurantId -> restaurants.id"
      }
    ]
  },
  {
    "id": "time_entry_change_requests",
    "name": "time_entry_change_requests",
    "feature": "scheduling",
    "domain": "operations",
    "description": "Snapshot técnico derivado de Prisma para time_entry_change_requests.",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "nullable": false,
        "primaryKey": true,
        "description": "Campo id documentado desde time_entry_change_requests."
      },
      {
        "name": "timeEntryId",
        "type": "String",
        "nullable": false,
        "reference": "time_entries.id",
        "description": "Campo timeEntryId documentado desde time_entry_change_requests."
      },
      {
        "name": "restaurantId",
        "type": "String",
        "nullable": false,
        "reference": "restaurants.id",
        "description": "Campo restaurantId documentado desde time_entry_change_requests."
      },
      {
        "name": "requestedByUserId",
        "type": "String",
        "nullable": false,
        "description": "Campo requestedByUserId documentado desde time_entry_change_requests."
      },
      {
        "name": "requestedClockInAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo requestedClockInAt documentado desde time_entry_change_requests."
      },
      {
        "name": "requestedClockOutAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo requestedClockOutAt documentado desde time_entry_change_requests."
      },
      {
        "name": "requestedClockInNote",
        "type": "String",
        "nullable": true,
        "description": "Campo requestedClockInNote documentado desde time_entry_change_requests."
      },
      {
        "name": "requestedClockOutNote",
        "type": "String",
        "nullable": true,
        "description": "Campo requestedClockOutNote documentado desde time_entry_change_requests."
      },
      {
        "name": "reason",
        "type": "String",
        "nullable": false,
        "description": "Campo reason documentado desde time_entry_change_requests."
      },
      {
        "name": "status",
        "type": "TimeEntryChangeRequestStatus",
        "nullable": false,
        "description": "Campo status documentado desde time_entry_change_requests."
      },
      {
        "name": "reviewedByUserId",
        "type": "String",
        "nullable": true,
        "description": "Campo reviewedByUserId documentado desde time_entry_change_requests."
      },
      {
        "name": "reviewedAt",
        "type": "DateTime",
        "nullable": true,
        "description": "Campo reviewedAt documentado desde time_entry_change_requests."
      },
      {
        "name": "reviewNote",
        "type": "String",
        "nullable": true,
        "description": "Campo reviewNote documentado desde time_entry_change_requests."
      },
      {
        "name": "createdAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo createdAt documentado desde time_entry_change_requests."
      },
      {
        "name": "updatedAt",
        "type": "DateTime",
        "nullable": false,
        "description": "Campo updatedAt documentado desde time_entry_change_requests."
      }
    ],
    "relations": [
      {
        "source": "time_entry_change_requests.timeEntryId",
        "target": "time_entries.id",
        "reference": "time_entries.id",
        "label": "time_entry_change_requests.timeEntryId -> time_entries.id"
      },
      {
        "source": "time_entry_change_requests.restaurantId",
        "target": "restaurants.id",
        "reference": "restaurants.id",
        "label": "time_entry_change_requests.restaurantId -> restaurants.id"
      }
    ]
  }
];
