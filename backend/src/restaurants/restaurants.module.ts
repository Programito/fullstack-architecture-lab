import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';

import { ChargeRestaurantServicePointUseCase } from './application/use-cases/charge-restaurant-service-point.use-case';
import { GetRestaurantFloorsUseCase } from './application/use-cases/get-restaurant-floors.use-case';
import { GetRestaurantMenuUseCase } from './application/use-cases/get-restaurant-menu.use-case';
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
import { OpenRestaurantOrderUseCase } from './application/use-cases/open-restaurant-order.use-case';
import { AddRestaurantOrderLineUseCase } from './application/use-cases/add-restaurant-order-line.use-case';
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
    OpenRestaurantOrderUseCase,
    AddRestaurantOrderLineUseCase,
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
    {
      provide: RESTAURANT_READ_REPOSITORY,
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
  ],
})
export class RestaurantsModule {}
