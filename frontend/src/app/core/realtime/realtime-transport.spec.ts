import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SocketIoRealtimeTransport } from './realtime-transport';

describe('SocketIoRealtimeTransport', () => {
  let mockOn: ReturnType<typeof vi.fn>;
  let mockEmit: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let mockSocket: { on: typeof mockOn; emit: typeof mockEmit; disconnect: typeof mockDisconnect; connected: boolean };
  let mockCreateSocket: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOn = vi.fn();
    mockEmit = vi.fn();
    mockDisconnect = vi.fn();
    mockSocket = { on: mockOn, emit: mockEmit, disconnect: mockDisconnect, connected: false };
    mockCreateSocket = vi.fn().mockReturnValue(mockSocket);
  });

  it('crea el socket bajo el namespace /realtime con la url dada', () => {
    const transport = new SocketIoRealtimeTransport(mockCreateSocket as any);
    transport.connect('http://localhost:3000', () => ({ token: 'tok' }));

    expect(mockCreateSocket).toHaveBeenCalledWith(
      'http://localhost:3000/realtime',
      expect.objectContaining({ auth: expect.any(Function) }),
    );
  });

  it('no vuelve a crear el socket si ya está conectado', () => {
    const transport = new SocketIoRealtimeTransport(mockCreateSocket as any);
    transport.connect(undefined, () => ({ token: 'tok' }));
    mockSocket.connected = true;
    transport.connect(undefined, () => ({ token: 'tok' }));

    expect(mockCreateSocket).toHaveBeenCalledTimes(1);
  });

  it('delega emit en el socket subyacente', () => {
    const transport = new SocketIoRealtimeTransport(mockCreateSocket as any);
    transport.connect(undefined, () => ({ token: 'tok' }));
    transport.emit('join-restaurant', 'restaurant-1');

    expect(mockEmit).toHaveBeenCalledWith('join-restaurant', 'restaurant-1');
  });

  it('registra listeners y los reengancha al socket real aunque se llamen antes de connect', () => {
    const transport = new SocketIoRealtimeTransport(mockCreateSocket as any);
    const handler = vi.fn();
    transport.on('order:invalidated', handler);
    transport.connect(undefined, () => ({ token: 'tok' }));

    expect(mockOn).toHaveBeenCalledWith('order:invalidated', handler);
  });

  it('desconecta y libera el socket subyacente', () => {
    const transport = new SocketIoRealtimeTransport(mockCreateSocket as any);
    transport.connect(undefined, () => ({ token: 'tok' }));
    transport.disconnect();

    expect(mockDisconnect).toHaveBeenCalledOnce();
  });
});
