import { forwardRef, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';

import { ChargeRestaurantServicePointUseCase } from './application/use-cases/charge-restaurant-service-point.use-case';
import { GetRestaurantFloorsUseCase } from './application/use-cases/get-restaurant-floors.use-case';
import { GetRestaurantMenuUseCase } from './application/use-cases/get-restaurant-menu.use-case';
import { SetRestaurantMenuItemAvailabilityUseCase } from './application/use-cases/set-restaurant-menu-item-availability.use-case';
import { GetRestaurantServiceFloorUseCase } from './application/use-cases/get-restaurant-service-floor.use-case';
import { GetRestaurantServicePointOrderUseCase } from './application/use-cases/get-restaurant-service-point-order.use-case';
import { GetRestaurantServicePointUseCase } from './application/use-cases/get-restaurant-service-point.use-case';
import { ListRestaurantReservationsUseCase } from './application/use-cases/list-restaurant-reservations.use-case';
import { ListRestaurantsUseCase } from './application/use-cases/list-restaurants.use-case';
import { MarkRestaurantServicePointOrderServedUseCase } from './application/use-cases/mark-restaurant-service-point-order-served.use-case';
import { OccupyRestaurantServicePointUseCase } from './application/use-cases/occupy-restaurant-service-point.use-case';
import { SendRestaurantServicePointOrderToKitchenUseCase } from './application/use-cases/send-restaurant-service-point-order-to-kitchen.use-case';
import { CreateFloorElementUseCase } from './application/use-cases/create-floor-element.use-case';
import { ReorderFloorElementsUseCase } from './application/use-cases/reorder-floor-elements.use-case';
import { UpdateFloorElementUseCase } from './application/use-cases/update-floor-element.use-case';
import { UpdateRestaurantFloorUseCase } from './application/use-cases/update-restaurant-floor.use-case';
import { RESTAURANT_ORDER_CATALOG_REPOSITORY } from './application/ports/restaurant-order-catalog-repository.port';
import { RESTAURANT_ORDER_REPOSITORY } from './application/ports/restaurant-order-repository.port';
import { RESTAURANT_ANALYTICS_REPOSITORY } from './application/ports/restaurant-analytics-repository.port';
import { RESTAURANT_READ_REPOSITORY } from './application/ports/restaurant-read-repository.port';
import { RESTAURANT_MENU_ADMIN_REPOSITORY } from './application/ports/restaurant-menu-admin-repository.port';
import { CreateMenuSectionUseCase } from './application/use-cases/create-menu-section.use-case';
import { UpdateMenuSectionUseCase } from './application/use-cases/update-menu-section.use-case';
import { DeleteMenuSectionUseCase } from './application/use-cases/delete-menu-section.use-case';
import { AddMenuSectionItemUseCase } from './application/use-cases/add-menu-section-item.use-case';
import { UpdateMenuSectionItemUseCase } from './application/use-cases/update-menu-section-item.use-case';
import { RemoveMenuSectionItemUseCase } from './application/use-cases/remove-menu-section-item.use-case';
import { ReorderMenuSectionsUseCase } from './application/use-cases/reorder-menu-sections.use-case';
import { ReorderMenuSectionItemsUseCase } from './application/use-cases/reorder-menu-section-items.use-case';
import { ListRestaurantProductsUseCase } from './application/use-cases/list-restaurant-products.use-case';
import { GetRestaurantProductUseCase } from './application/use-cases/get-restaurant-product.use-case';
import { CreateRestaurantProductUseCase } from './application/use-cases/create-restaurant-product.use-case';
import { UpdateRestaurantProductUseCase } from './application/use-cases/update-restaurant-product.use-case';
import { DeleteRestaurantProductUseCase } from './application/use-cases/delete-restaurant-product.use-case';
import { UpdateRestaurantReservationStatusUseCase } from './application/use-cases/update-restaurant-reservation-status.use-case';
import { CreateRestaurantReservationUseCase } from './application/use-cases/create-restaurant-reservation.use-case';
import { GetRestaurantServiceWindowsUseCase } from './application/use-cases/get-restaurant-service-windows.use-case';
import { UpdateRestaurantServiceWindowsUseCase } from './application/use-cases/update-restaurant-service-windows.use-case';
import { RESTAURANT_SERVICE_WINDOWS_REPOSITORY } from './application/ports/restaurant-service-windows-repository.port';
import { SearchCustomersUseCase } from './application/use-cases/search-customers.use-case';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { CUSTOMER_REPOSITORY } from './application/ports/customer-repository.port';
import { PRODUCT_IMAGE_SIGNING_PORT } from './application/ports/product-image-signing.port';
import { PrismaCustomerRepository } from './infrastructure/persistence/prisma-customer.repository';
import { PrismaRestaurantMenuAdminRepository } from './infrastructure/persistence/prisma-restaurant-menu-admin.repository';
import { CloudinaryProductImageSigner } from './infrastructure/media/cloudinary-product-image-signer';
import { OpenRestaurantOrderUseCase } from './application/use-cases/open-restaurant-order.use-case';
import { AddRestaurantOrderLineUseCase } from './application/use-cases/add-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineUseCase } from './application/use-cases/update-restaurant-order-line.use-case';
import { DeleteRestaurantOrderLineUseCase } from './application/use-cases/delete-restaurant-order-line.use-case';
import { CancelRestaurantOrderLineUseCase } from './application/use-cases/cancel-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineStatusUseCase } from './application/use-cases/update-restaurant-order-line-status.use-case';
import { FreeRestaurantServicePointUseCase } from './application/use-cases/free-restaurant-service-point.use-case';
import { RegisterRestaurantOrderPaymentUseCase } from './application/use-cases/register-restaurant-order-payment.use-case';
import { GetRestaurantAnalyticsReportUseCase } from './application/use-cases/get-restaurant-analytics-report.use-case';
import { PrismaRestaurantOrderCatalogRepository } from './infrastructure/persistence/prisma-restaurant-order-catalog.repository';
import { PrismaRestaurantOrderRepository } from './infrastructure/persistence/prisma-restaurant-order.repository';
import { PrismaRestaurantReadRepository } from './infrastructure/persistence/prisma-restaurant-read.repository';
import { PrismaRestaurantAnalyticsRepository } from './infrastructure/persistence/prisma-restaurant-analytics.repository';
import { PrismaRestaurantServiceWindowsRepository } from './infrastructure/persistence/prisma-restaurant-service-windows.repository';
import { RestaurantsController } from './presentation/rest/restaurants.controller';
import { RestaurantMenuController } from './presentation/rest/restaurant-menu.controller';
import { RestaurantOrderController } from './presentation/rest/restaurant-order.controller';
import { RestaurantFloorController } from './presentation/rest/restaurant-floor.controller';
import { RestaurantReservationsController } from './presentation/rest/restaurant-reservations.controller';
import { RestaurantProductsController } from './presentation/rest/restaurant-products.controller';
import { RestaurantCustomersController } from './presentation/rest/restaurant-customers.controller';
import { RestaurantServiceController } from './presentation/rest/restaurant-service.controller';
import { CreateProductImageUploadSignatureUseCase } from './application/use-cases/create-product-image-upload-signature.use-case';
import { ListModifierGroupsUseCase } from './application/use-cases/list-modifier-groups.use-case';
import { CreateModifierGroupUseCase } from './application/use-cases/create-modifier-group.use-case';
import { UpdateModifierGroupUseCase } from './application/use-cases/update-modifier-group.use-case';
import { DeleteModifierGroupUseCase } from './application/use-cases/delete-modifier-group.use-case';
import { MODIFIER_GROUP_REPOSITORY } from './application/ports/modifier-group-repository.port';
import { PrismaModifierGroupRepository } from './infrastructure/persistence/prisma-modifier-group.repository';
import { RestaurantModifierGroupsController } from './presentation/rest/restaurant-modifier-groups.controller';
import { RestaurantAnalyticsController } from './presentation/rest/restaurant-analytics.controller';
import { CreateComboSlotUseCase } from './application/use-cases/create-combo-slot.use-case';
import { UpdateComboSlotUseCase } from './application/use-cases/update-combo-slot.use-case';
import { DeleteComboSlotUseCase } from './application/use-cases/delete-combo-slot.use-case';
import { COMBO_SLOT_REPOSITORY } from './application/ports/combo-slot-repository.port';
import { PrismaComboSlotRepository } from './infrastructure/persistence/prisma-combo-slot.repository';
import { RestaurantComboSlotsController } from './presentation/rest/restaurant-combo-slots.controller';
import { CreatePlatterComponentUseCase } from './application/use-cases/create-platter-component.use-case';
import { UpdatePlatterComponentUseCase } from './application/use-cases/update-platter-component.use-case';
import { DeletePlatterComponentUseCase } from './application/use-cases/delete-platter-component.use-case';
import { PLATTER_COMPONENT_REPOSITORY } from './application/ports/platter-component-repository.port';
import { PrismaPlatterComponentRepository } from './infrastructure/persistence/prisma-platter-component.repository';
import { RestaurantPlatterComponentsController } from './presentation/rest/restaurant-platter-components.controller';
import { ListTaxRatesUseCase } from './application/use-cases/list-tax-rates.use-case';
import { CreateTaxRateUseCase } from './application/use-cases/create-tax-rate.use-case';
import { UpdateTaxRateUseCase } from './application/use-cases/update-tax-rate.use-case';
import { DeleteTaxRateUseCase } from './application/use-cases/delete-tax-rate.use-case';
import { TAX_RATE_REPOSITORY } from './application/ports/tax-rate-repository.port';
import { PrismaTaxRateRepository } from './infrastructure/persistence/prisma-tax-rate.repository';
import { RestaurantTaxRatesController } from './presentation/rest/restaurant-tax-rates.controller';
import { ListModifierOptionOverridesUseCase } from './application/use-cases/list-modifier-option-overrides.use-case';
import { SetModifierOptionPriceOverrideUseCase } from './application/use-cases/set-modifier-option-price-override.use-case';
import { ClearModifierOptionPriceOverrideUseCase } from './application/use-cases/clear-modifier-option-price-override.use-case';
import { MODIFIER_OPTION_OVERRIDE_REPOSITORY } from './application/ports/modifier-option-override-repository.port';
import { PrismaModifierOptionOverrideRepository } from './infrastructure/persistence/prisma-modifier-option-override.repository';
import { RestaurantModifierOptionOverridesController } from './presentation/rest/restaurant-modifier-option-overrides.controller';

@Module({
  imports: [forwardRef(() => IdentityModule)],
  controllers: [
    RestaurantsController,
    RestaurantMenuController,
    RestaurantOrderController,
    RestaurantFloorController,
    RestaurantReservationsController,
    RestaurantProductsController,
    RestaurantCustomersController,
    RestaurantServiceController,
    RestaurantModifierGroupsController,
    RestaurantAnalyticsController,
    RestaurantComboSlotsController,
    RestaurantPlatterComponentsController,
    RestaurantTaxRatesController,
    RestaurantModifierOptionOverridesController,
  ],
  providers: [
    ListRestaurantsUseCase,
    GetRestaurantAnalyticsReportUseCase,
    GetRestaurantMenuUseCase,
    SetRestaurantMenuItemAvailabilityUseCase,
    OpenRestaurantOrderUseCase,
    AddRestaurantOrderLineUseCase,
    UpdateRestaurantOrderLineUseCase,
    DeleteRestaurantOrderLineUseCase,
    CancelRestaurantOrderLineUseCase,
    UpdateRestaurantOrderLineStatusUseCase,
    FreeRestaurantServicePointUseCase,
    RegisterRestaurantOrderPaymentUseCase,
    GetRestaurantFloorsUseCase,
    GetRestaurantServiceFloorUseCase,
    GetRestaurantServicePointUseCase,
    GetRestaurantServicePointOrderUseCase,
    ChargeRestaurantServicePointUseCase,
    OccupyRestaurantServicePointUseCase,
    SendRestaurantServicePointOrderToKitchenUseCase,
    MarkRestaurantServicePointOrderServedUseCase,
    ListRestaurantReservationsUseCase,
    CreateFloorElementUseCase,
    ReorderFloorElementsUseCase,
    UpdateFloorElementUseCase,
    UpdateRestaurantFloorUseCase,
    PrismaRestaurantReadRepository,
    PrismaRestaurantAnalyticsRepository,
    PrismaRestaurantOrderCatalogRepository,
    PrismaRestaurantOrderRepository,
    PrismaRestaurantMenuAdminRepository,
    PrismaCustomerRepository,
    PrismaRestaurantServiceWindowsRepository,
    CreateMenuSectionUseCase,
    UpdateMenuSectionUseCase,
    DeleteMenuSectionUseCase,
    AddMenuSectionItemUseCase,
    UpdateMenuSectionItemUseCase,
    RemoveMenuSectionItemUseCase,
    ReorderMenuSectionsUseCase,
    ReorderMenuSectionItemsUseCase,
    ListRestaurantProductsUseCase,
    GetRestaurantProductUseCase,
    CreateRestaurantProductUseCase,
    UpdateRestaurantProductUseCase,
    DeleteRestaurantProductUseCase,
    CreateRestaurantReservationUseCase,
    UpdateRestaurantReservationStatusUseCase,
    GetRestaurantServiceWindowsUseCase,
    UpdateRestaurantServiceWindowsUseCase,
    SearchCustomersUseCase,
    CreateCustomerUseCase,
    CreateProductImageUploadSignatureUseCase,
    ListModifierGroupsUseCase,
    CreateModifierGroupUseCase,
    UpdateModifierGroupUseCase,
    DeleteModifierGroupUseCase,
    PrismaModifierGroupRepository,
    {
      provide: MODIFIER_GROUP_REPOSITORY,
      useExisting: PrismaModifierGroupRepository,
    },
    CreateComboSlotUseCase,
    UpdateComboSlotUseCase,
    DeleteComboSlotUseCase,
    PrismaComboSlotRepository,
    {
      provide: COMBO_SLOT_REPOSITORY,
      useExisting: PrismaComboSlotRepository,
    },
    CreatePlatterComponentUseCase,
    UpdatePlatterComponentUseCase,
    DeletePlatterComponentUseCase,
    PrismaPlatterComponentRepository,
    {
      provide: PLATTER_COMPONENT_REPOSITORY,
      useExisting: PrismaPlatterComponentRepository,
    },
    ListTaxRatesUseCase,
    CreateTaxRateUseCase,
    UpdateTaxRateUseCase,
    DeleteTaxRateUseCase,
    PrismaTaxRateRepository,
    {
      provide: TAX_RATE_REPOSITORY,
      useExisting: PrismaTaxRateRepository,
    },
    ListModifierOptionOverridesUseCase,
    SetModifierOptionPriceOverrideUseCase,
    ClearModifierOptionPriceOverrideUseCase,
    PrismaModifierOptionOverrideRepository,
    {
      provide: MODIFIER_OPTION_OVERRIDE_REPOSITORY,
      useExisting: PrismaModifierOptionOverrideRepository,
    },
    {
      provide: CUSTOMER_REPOSITORY,
      useExisting: PrismaCustomerRepository,
    },
    {
      provide: RESTAURANT_READ_REPOSITORY,
      useExisting: PrismaRestaurantReadRepository,
    },
    {
      provide: RESTAURANT_ANALYTICS_REPOSITORY,
      useExisting: PrismaRestaurantAnalyticsRepository,
    },
    {
      provide: RESTAURANT_SERVICE_WINDOWS_REPOSITORY,
      useExisting: PrismaRestaurantServiceWindowsRepository,
    },
    {
      provide: RESTAURANT_ORDER_CATALOG_REPOSITORY,
      useExisting: PrismaRestaurantOrderCatalogRepository,
    },
    {
      provide: RESTAURANT_ORDER_REPOSITORY,
      useExisting: PrismaRestaurantOrderRepository,
    },
    {
      provide: RESTAURANT_MENU_ADMIN_REPOSITORY,
      useExisting: PrismaRestaurantMenuAdminRepository,
    },
    CloudinaryProductImageSigner,
    {
      provide: PRODUCT_IMAGE_SIGNING_PORT,
      useExisting: CloudinaryProductImageSigner,
    },
  ],
  exports: [RESTAURANT_READ_REPOSITORY],
})
export class RestaurantsModule {}
