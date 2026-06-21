CREATE TYPE "UserRoleAssignmentScopeType" AS ENUM ('organization', 'restaurant');
CREATE TYPE "OrganizationAccountType" AS ENUM ('regular', 'demo', 'internal');
CREATE TYPE "ProductType" AS ENUM ('simple', 'combo', 'platter');
CREATE TYPE "ProductCourse" AS ENUM ('drinks', 'starter', 'main', 'dessert', 'other');
CREATE TYPE "PreparationRoute" AS ENUM ('direct', 'bar', 'kitchen', 'cold_station', 'dessert_station');
CREATE TYPE "ModifierSelectionType" AS ENUM ('single', 'multiple');
CREATE TYPE "ComboPricingMode" AS ENUM ('fixed', 'base_plus_supplements');

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "accountType" "OrganizationAccountType" NOT NULL DEFAULT 'regular',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_role_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeType" "UserRoleAssignmentScopeType" NOT NULL,
    "organizationId" TEXT,
    "restaurantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_role_assignments_scope_ck" CHECK (
        ("scopeType" = 'organization' AND "organizationId" IS NOT NULL AND "restaurantId" IS NULL)
        OR
        ("scopeType" = 'restaurant' AND "organizationId" IS NOT NULL AND "restaurantId" IS NOT NULL)
    )
);

CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productType" "ProductType" NOT NULL,
    "defaultCourse" "ProductCourse" NOT NULL,
    "defaultPreparationRoute" "PreparationRoute" NOT NULL,
    "taxRateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurant_products" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "displayName" TEXT,
    "displayDescription" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "preparationRouteOverride" "PreparationRoute",
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurant_menus" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_menus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_sections" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "menuSectionId" TEXT NOT NULL,
    "restaurantProductId" TEXT NOT NULL,
    "displayNameOverride" TEXT,
    "priceOverrideCents" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "modifier_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selectionType" "ModifierSelectionType" NOT NULL,
    "minSelections" INTEGER NOT NULL,
    "maxSelections" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "modifier_groups_selection_bounds_ck" CHECK ("minSelections" <= "maxSelections"),
    CONSTRAINT "modifier_groups_single_ck" CHECK ("selectionType" <> 'single' OR "maxSelections" = 1)
);

CREATE TABLE "modifier_options" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurant_product_modifier_groups" (
    "id" TEXT NOT NULL,
    "restaurantProductId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "restaurant_product_modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "combo_definitions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pricingMode" "ComboPricingMode" NOT NULL,
    "basePriceCents" INTEGER,

    CONSTRAINT "combo_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "combo_slots" (
    "id" TEXT NOT NULL,
    "comboDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelections" INTEGER NOT NULL,
    "maxSelections" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "combo_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "combo_slot_options" (
    "id" TEXT NOT NULL,
    "comboSlotId" TEXT NOT NULL,
    "restaurantProductId" TEXT NOT NULL,
    "supplementPriceCents" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "combo_slot_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platter_definitions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "platter_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platter_components" (
    "id" TEXT NOT NULL,
    "platterDefinitionId" TEXT NOT NULL,
    "componentProductId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER,
    "isRemovable" BOOLEAN NOT NULL DEFAULT false,
    "isReplaceable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "platter_components_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
CREATE UNIQUE INDEX "restaurants_organizationId_name_key" ON "restaurants"("organizationId", "name");
CREATE INDEX "user_role_assignments_userId_roleId_scopeType_organizationId_restaurant_idx" ON "user_role_assignments"("userId", "roleId", "scopeType", "organizationId", "restaurantId");
CREATE UNIQUE INDEX "tax_rates_organizationId_name_key" ON "tax_rates"("organizationId", "name");
CREATE UNIQUE INDEX "products_organizationId_name_key" ON "products"("organizationId", "name");
CREATE INDEX "products_organizationId_productType_idx" ON "products"("organizationId", "productType");
CREATE UNIQUE INDEX "restaurant_products_restaurantId_productId_key" ON "restaurant_products"("restaurantId", "productId");
CREATE INDEX "restaurant_products_restaurantId_sortOrder_idx" ON "restaurant_products"("restaurantId", "sortOrder");
CREATE UNIQUE INDEX "restaurant_menus_restaurantId_name_key" ON "restaurant_menus"("restaurantId", "name");
CREATE UNIQUE INDEX "menu_sections_menuId_sortOrder_key" ON "menu_sections"("menuId", "sortOrder");
CREATE UNIQUE INDEX "menu_sections_menuId_name_key" ON "menu_sections"("menuId", "name");
CREATE UNIQUE INDEX "menu_items_menuSectionId_restaurantProductId_key" ON "menu_items"("menuSectionId", "restaurantProductId");
CREATE UNIQUE INDEX "menu_items_menuSectionId_sortOrder_key" ON "menu_items"("menuSectionId", "sortOrder");
CREATE UNIQUE INDEX "modifier_groups_organizationId_name_key" ON "modifier_groups"("organizationId", "name");
CREATE UNIQUE INDEX "modifier_options_modifierGroupId_name_key" ON "modifier_options"("modifierGroupId", "name");
CREATE UNIQUE INDEX "modifier_options_modifierGroupId_sortOrder_key" ON "modifier_options"("modifierGroupId", "sortOrder");
CREATE UNIQUE INDEX "restaurant_product_modifier_groups_restaurantProductId_modifierG_key" ON "restaurant_product_modifier_groups"("restaurantProductId", "modifierGroupId");
CREATE UNIQUE INDEX "restaurant_product_modifier_groups_restaurantProductId_sortO_key" ON "restaurant_product_modifier_groups"("restaurantProductId", "sortOrder");
CREATE UNIQUE INDEX "combo_definitions_productId_key" ON "combo_definitions"("productId");
CREATE UNIQUE INDEX "combo_slots_comboDefinitionId_sortOrder_key" ON "combo_slots"("comboDefinitionId", "sortOrder");
CREATE UNIQUE INDEX "combo_slots_comboDefinitionId_name_key" ON "combo_slots"("comboDefinitionId", "name");
CREATE UNIQUE INDEX "combo_slot_options_comboSlotId_restaurantProductId_key" ON "combo_slot_options"("comboSlotId", "restaurantProductId");
CREATE UNIQUE INDEX "combo_slot_options_comboSlotId_sortOrder_key" ON "combo_slot_options"("comboSlotId", "sortOrder");
CREATE UNIQUE INDEX "platter_definitions_productId_key" ON "platter_definitions"("productId");
CREATE UNIQUE INDEX "platter_components_platterDefinitionId_sortOrder_key" ON "platter_components"("platterDefinitionId", "sortOrder");

ALTER TABLE "restaurants"
ADD CONSTRAINT "restaurants_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
ADD CONSTRAINT "user_role_assignments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
ADD CONSTRAINT "user_role_assignments_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "roles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
ADD CONSTRAINT "user_role_assignments_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
ADD CONSTRAINT "user_role_assignments_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tax_rates"
ADD CONSTRAINT "tax_rates_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
ADD CONSTRAINT "products_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
ADD CONSTRAINT "products_taxRateId_fkey"
FOREIGN KEY ("taxRateId") REFERENCES "tax_rates"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "restaurant_products"
ADD CONSTRAINT "restaurant_products_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_products"
ADD CONSTRAINT "restaurant_products_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_menus"
ADD CONSTRAINT "restaurant_menus_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_sections"
ADD CONSTRAINT "menu_sections_menuId_fkey"
FOREIGN KEY ("menuId") REFERENCES "restaurant_menus"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_items"
ADD CONSTRAINT "menu_items_menuSectionId_fkey"
FOREIGN KEY ("menuSectionId") REFERENCES "menu_sections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_items"
ADD CONSTRAINT "menu_items_restaurantProductId_fkey"
FOREIGN KEY ("restaurantProductId") REFERENCES "restaurant_products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "modifier_groups"
ADD CONSTRAINT "modifier_groups_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "modifier_options"
ADD CONSTRAINT "modifier_options_modifierGroupId_fkey"
FOREIGN KEY ("modifierGroupId") REFERENCES "modifier_groups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_product_modifier_groups"
ADD CONSTRAINT "restaurant_product_modifier_groups_restaurantProductId_fkey"
FOREIGN KEY ("restaurantProductId") REFERENCES "restaurant_products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_product_modifier_groups"
ADD CONSTRAINT "restaurant_product_modifier_groups_modifierGroupId_fkey"
FOREIGN KEY ("modifierGroupId") REFERENCES "modifier_groups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "combo_definitions"
ADD CONSTRAINT "combo_definitions_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "combo_slots"
ADD CONSTRAINT "combo_slots_comboDefinitionId_fkey"
FOREIGN KEY ("comboDefinitionId") REFERENCES "combo_definitions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "combo_slot_options"
ADD CONSTRAINT "combo_slot_options_comboSlotId_fkey"
FOREIGN KEY ("comboSlotId") REFERENCES "combo_slots"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "combo_slot_options"
ADD CONSTRAINT "combo_slot_options_restaurantProductId_fkey"
FOREIGN KEY ("restaurantProductId") REFERENCES "restaurant_products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platter_definitions"
ADD CONSTRAINT "platter_definitions_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platter_components"
ADD CONSTRAINT "platter_components_platterDefinitionId_fkey"
FOREIGN KEY ("platterDefinitionId") REFERENCES "platter_definitions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platter_components"
ADD CONSTRAINT "platter_components_componentProductId_fkey"
FOREIGN KEY ("componentProductId") REFERENCES "products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
