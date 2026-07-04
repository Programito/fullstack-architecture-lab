import { InjectionToken } from '@angular/core';
import { io, type Socket } from 'socket.io-client';

export type RealtimeAuthProvider = () => { token: string };

export interface RealtimeTransport {
  connect(url: string | undefined, auth: RealtimeAuthProvider): void;
  on(event: string, handler: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;
  disconnect(): void;
}

export const REALTIME_TRANSPORT = new InjectionToken<RealtimeTransport>('REALTIME_TRANSPORT', {
  providedIn: 'root',
  factory: () => new SocketIoRealtimeTransport(),
});

export class SocketIoRealtimeTransport implements RealtimeTransport {
  private socket: Socket | null = null;
  private readonly pendingListeners: Array<{ event: string; handler: (payload: unknown) => void }> = [];

  constructor(private readonly createSocket: typeof io = io) {}

  connect(url: string | undefined, auth: RealtimeAuthProvider): void {
    if (this.socket?.connected) return;

    this.socket = this.createSocket(`${url ?? ''}/realtime`, {
      auth: (callback: (data: { token: string }) => void) => callback(auth()),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    for (const { event, handler } of this.pendingListeners) {
      this.socket.on(event, handler);
    }
  }

  on(event: string, handler: (payload: unknown) => void): void {
    this.pendingListeners.push({ event, handler });
    this.socket?.on(event, handler);
  }

  emit(event: string, payload: unknown): void {
    this.socket?.emit(event, payload);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
