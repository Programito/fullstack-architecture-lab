import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientLogsService } from '../observability/client-logs.service';
import { IdentitySessionStore } from '../../features/identity/identity-session.store';
import { RestaurantContextStore } from '../../features/restaurant-pos/state/restaurant-context.store';
import { REALTIME_TRANSPORT } from './realtime-transport';
import { REALTIME_ENABLED, REALTIME_URL } from './realtime.config';
import { RealtimeService } from './realtime.service';

const RESTAURANT_A = { id: 'restaurant-a' } as unknown as { id: string };
const RESTAURANT_B = { id: 'restaurant-b' } as unknown as { id: string };

describe('RealtimeService', () => {
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let activeRestaurant: ReturnType<typeof signal<{ id: string } | null>>;
  let session: ReturnType<typeof signal<{ accessToken: string | null }>>;
  let transport: {
    connect: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let clientLogs: { log: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    isAuthenticated = signal(false);
    activeRestaurant = signal<{ id: string } | null>(null);
    session = signal({ accessToken: 'access-token-1' });
    transport = { connect: vi.fn(), on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
    clientLogs = { log: vi.fn() };
  });

  function setup(enabled = true) {
    TestBed.configureTestingModule({
      providers: [
        { provide: REALTIME_ENABLED, useValue: enabled },
        { provide: REALTIME_URL, useValue: undefined },
        { provide: REALTIME_TRANSPORT, useValue: transport },
        {
          provide: IdentitySessionStore,
          useValue: { isAuthenticated: isAuthenticated.asReadonly(), session: session.asReadonly() },
        },
        { provide: RestaurantContextStore, useValue: { activeRestaurant: activeRestaurant.asReadonly() } },
        { provide: ClientLogsService, useValue: clientLogs },
      ],
    });
    return TestBed.inject(RealtimeService);
  }

  function getHandler(event: string): ((payload: unknown) => void) | undefined {
    return transport.on.mock.calls.find(([registeredEvent]) => registeredEvent === event)?.[1] as
      | ((payload: unknown) => void)
      | undefined;
  }

  it('no conecta cuando el flag REALTIME_ENABLED está desactivado', () => {
    setup(false);
    isAuthenticated.set(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    expect(transport.connect).not.toHaveBeenCalled();
  });

  it('no conecta si no hay usuario autenticado', () => {
    setup(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    expect(transport.connect).not.toHaveBeenCalled();
  });

  it('conecta y se une a la room del restaurante activo cuando hay auth y restaurante', () => {
    setup(true);
    isAuthenticated.set(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    expect(transport.connect).toHaveBeenCalledOnce();
    expect(transport.emit).toHaveBeenCalledWith('join-restaurant', 'restaurant-a');
  });

  it('se une a la nueva room al cambiar de restaurante activo sin reconectar el transporte', () => {
    setup(true);
    isAuthenticated.set(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    activeRestaurant.set(RESTAURANT_B);
    TestBed.flushEffects();

    expect(transport.connect).toHaveBeenCalledOnce();
    expect(transport.emit).toHaveBeenNthCalledWith(2, 'join-restaurant', 'restaurant-b');
  });

  it('reenvía order:invalidated recibido del transporte a invalidated$', () => {
    const service = setup(true);
    isAuthenticated.set(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    const received: unknown[] = [];
    service.invalidated$.subscribe((event) => received.push(event));

    const registeredHandler = transport.on.mock.calls.find(([event]) => event === 'order:invalidated')?.[1] as
      | ((payload: unknown) => void)
      | undefined;
    registeredHandler?.({ restaurantId: 'restaurant-a', tableId: 'table-1', orderId: 'order-1', reason: 'order.opened' });

    expect(received).toEqual([
      { restaurantId: 'restaurant-a', tableId: 'table-1', orderId: 'order-1', reason: 'order.opened' },
    ]);
  });

  it('desconecta el transporte al perder la autenticación', () => {
    setup(true);
    isAuthenticated.set(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    isAuthenticated.set(false);
    TestBed.flushEffects();

    expect(transport.disconnect).toHaveBeenCalledOnce();
  });

  it('loguea un connect_error del transporte como warning sin lanzar', () => {
    setup(true);
    isAuthenticated.set(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    const handler = getHandler('connect_error');
    expect(() => handler?.(new Error('boom'))).not.toThrow();
    expect(clientLogs.log).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warn', event: 'frontend.realtime.connect_error' }),
    );
  });

  it('loguea un reconnect del transporte como info', () => {
    setup(true);
    isAuthenticated.set(true);
    activeRestaurant.set(RESTAURANT_A);
    TestBed.flushEffects();

    const handler = getHandler('reconnect');
    handler?.(undefined);
    expect(clientLogs.log).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info', event: 'frontend.realtime.reconnected' }),
    );
  });
});
