import { Module } from '@nestjs/common';
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
import { DemoCustomerRepository } from './infrastructure/demo-customer.repository';
import { PrismaRestaurantMenuAdminRepository } from './infrastructure/persistence/prisma-restaurant-menu-admin.repository';
import { OpenRestaurantOrderUseCase } from './application/use-cases/open-restaurant-order.use-case';
import { AddRestaurantOrderLineUseCase } from './application/use-cases/add-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineUseCase } from './application/use-cases/update-restaurant-order-line.use-case';
import { DeleteRestaurantOrderLineUseCase } from './application/use-cases/delete-restaurant-order-line.use-case';
import { CancelRestaurantOrderLineUseCase } from './application/use-cases/cancel-restaurant-order-line.use-case';
import { UpdateRestaurantOrderLineStatusUseCase } from './application/use-cases/update-restaurant-order-line-status.use-case';
import { FreeRestaurantServicePointUseCase } from './application/use-cases/free-restaurant-service-point.use-case';
import { RegisterRestaurantOrderPaymentUseCase } from './application/use-cases/register-restaurant-order-payment.use-case';
import { DemoRestaurantReadRepository } from './infrastructure/demo-restaurant-read.repository';
import { PrismaRestaurantOrderCatalogRepository } from './infrastructure/persistence/prisma-restaurant-order-catalog.repository';
import { PrismaRestaurantOrderRepository } from './infrastructure/persistence/prisma-restaurant-order.repository';
import { RestaurantsController } from './presentation/rest/restaurants.controller';

@Module({
  imports: [IdentityModule],
  controllers: [RestaurantsController],
  providers: [
    ListRestaurantsUseCase,
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
    DemoRestaurantReadRepository,
    PrismaRestaurantOrderCatalogRepository,
    PrismaRestaurantOrderRepository,
    PrismaRestaurantMenuAdminRepository,
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
    DemoCustomerRepository,
    {
      provide: CUSTOMER_REPOSITORY,
      useExisting: DemoCustomerRepository,
    },
    {
      provide: RESTAURANT_READ_REPOSITORY,
      useExisting: DemoRestaurantReadRepository,
    },
    {
      provide: RESTAURANT_SERVICE_WINDOWS_REPOSITORY,
      useExisting: DemoRestaurantReadRepository,
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
  ],
})
export class RestaurantsModule {}
