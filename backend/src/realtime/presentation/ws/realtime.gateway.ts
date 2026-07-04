import { Inject, Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { AUTH_SESSION_REPOSITORY, type AuthSessionRepository } from '../../../identity/application/ports/auth-session-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../../../identity/application/ports/user-repository.port';
import { AuthTokenService } from '../../../identity/infrastructure/security/auth-token.service';
import { RestaurantScopeService } from '../../../identity/infrastructure/security/restaurant-scope.service';

type SocketAuth = { userId: string; scopes: { organizations: string[]; restaurants: string[] } };

export const SESSION_REVALIDATION_INTERVAL_MS = 60_000;

@Injectable()
@WebSocketGateway({ namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly tokens: AuthTokenService,
    private readonly scope: RestaurantScopeService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.tokens.verifyAccessToken(token);

      if (!(await this.isSessionValid(payload.sub, payload.sid))) {
        client.disconnect(true);
        return;
      }

      const auth: SocketAuth = {
        userId: payload.sub,
        scopes: payload.scopes ?? { organizations: [], restaurants: [] },
      };
      client.data.auth = auth;

      if (payload.exp) {
        const expiresInMs = payload.exp * 1000 - Date.now();
        if (expiresInMs <= 0) {
          client.disconnect(true);
          return;
        }
        client.data.expiryTimer = setTimeout(() => client.disconnect(true), expiresInMs);
      }

      client.data.sessionCheckInterval = setInterval(async () => {
        if (!(await this.isSessionValid(payload.sub, payload.sid))) {
          client.disconnect(true);
        }
      }, SESSION_REVALIDATION_INTERVAL_MS);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    clearTimeout(client.data.expiryTimer as ReturnType<typeof setTimeout> | undefined);
    clearInterval(client.data.sessionCheckInterval as ReturnType<typeof setInterval> | undefined);
  }

  private async isSessionValid(userId: string, sessionId: string): Promise<boolean> {
    const [user, session] = await Promise.all([this.users.findById(userId), this.sessions.findById(sessionId)]);
    return Boolean(user?.enabled && session?.isUsable() && session.userId === user.id);
  }

  @SubscribeMessage('join-restaurant')
  async handleJoinRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() restaurantId: string,
  ): Promise<void> {
    const auth = client.data.auth as SocketAuth | undefined;
    if (!auth) return;

    const joinedRestaurantId = client.data.joinedRestaurantId as string | undefined;
    if (joinedRestaurantId === restaurantId) return;

    const allowed = await this.scope.canAccessRestaurant(auth, restaurantId);
    if (!allowed) return;

    if (joinedRestaurantId) {
      await client.leave(`restaurant:${joinedRestaurantId}`);
    }

    await client.join(`restaurant:${restaurantId}`);
    client.data.joinedRestaurantId = restaurantId;
  }
}
