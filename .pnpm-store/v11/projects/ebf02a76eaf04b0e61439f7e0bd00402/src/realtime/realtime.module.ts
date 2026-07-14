import { DynamicModule, Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { REALTIME_ORDER_EVENT_PUBLISHER } from '../restaurants/application/ports/realtime-order-event-publisher.port';
import { NoopRealtimeOrderEventPublisher } from './infrastructure/noop-realtime-order-event-publisher';
import { SocketRealtimeOrderEventPublisher } from './infrastructure/socket-realtime-order-event-publisher';
import { RealtimeGateway } from './presentation/ws/realtime.gateway';

export type RealtimeModuleOptions = {
  enabled: boolean;
};

@Module({})
export class RealtimeModule {
  static register({ enabled }: RealtimeModuleOptions): DynamicModule {
    return {
      module: RealtimeModule,
      global: true,
      imports: [IdentityModule],
      providers: enabled
        ? [
            RealtimeGateway,
            SocketRealtimeOrderEventPublisher,
            { provide: REALTIME_ORDER_EVENT_PUBLISHER, useExisting: SocketRealtimeOrderEventPublisher },
          ]
        : [{ provide: REALTIME_ORDER_EVENT_PUBLISHER, useClass: NoopRealtimeOrderEventPublisher }],
      exports: [REALTIME_ORDER_EVENT_PUBLISHER],
    };
  }
}
