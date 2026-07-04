import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSessionRepository } from '../../../identity/application/ports/auth-session-repository.port';
import type { UserRepository } from '../../../identity/application/ports/user-repository.port';
import type { AuthTokenService } from '../../../identity/infrastructure/security/auth-token.service';
import type { RestaurantScopeService } from '../../../identity/infrastructure/security/restaurant-scope.service';
import { RealtimeGateway, SESSION_REVALIDATION_INTERVAL_MS } from './realtime.gateway';

const RESTAURANT_ID = 'restaurant-centro';
const USER_ID = 'user-1';
const SESSION_ID = 'session-1';

function makeSocket(token?: string) {
  return {
    handshake: { auth: { token } },
    data: {} as Record<string, unknown>,
    disconnect: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  };
}

function makeGateway(overrides: {
  verifyAccessToken?: ReturnType<typeof vi.fn>;
  canAccessRestaurant?: ReturnType<typeof vi.fn>;
  findUserById?: ReturnType<typeof vi.fn>;
  findSessionById?: ReturnType<typeof vi.fn>;
} = {}) {
  const tokens = { verifyAccessToken: overrides.verifyAccessToken ?? vi.fn() } as unknown as AuthTokenService;
  const scope = { canAccessRestaurant: overrides.canAccessRestaurant ?? vi.fn() } as unknown as RestaurantScopeService;
  const users = {
    findById: overrides.findUserById ?? vi.fn().mockResolvedValue({ id: USER_ID, enabled: true }),
  } as unknown as UserRepository;
  const sessions = {
    findById: overrides.findSessionById ?? vi.fn().mockResolvedValue({ userId: USER_ID, isUsable: () => true }),
  } as unknown as AuthSessionRepository;
  return { gateway: new RealtimeGateway(tokens, scope, users, sessions), tokens, scope, users, sessions };
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: USER_ID,
    sid: SESSION_ID,
    scopes: { organizations: [], restaurants: [RESTAURANT_ID] },
    exp: Math.floor(Date.now() / 1000) + 900,
    ...overrides,
  };
}

describe('RealtimeGateway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleConnection', () => {
    it('desconecta cuando no hay token en el handshake', async () => {
      const { gateway } = makeGateway();
      const client = makeSocket(undefined);
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('desconecta cuando el token es inválido o ha expirado', async () => {
      const verifyAccessToken = vi.fn().mockRejectedValue(new Error('invalid'));
      const { gateway } = makeGateway({ verifyAccessToken });
      const client = makeSocket('bad-token');
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.data.auth).toBeUndefined();
    });

    it('guarda el auth del socket cuando el token y la sesión son válidos', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const { gateway, users, sessions } = makeGateway({ verifyAccessToken });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.auth).toEqual({ userId: USER_ID, scopes: { organizations: [], restaurants: [RESTAURANT_ID] } });
      expect(users.findById).toHaveBeenCalledWith(USER_ID);
      expect(sessions.findById).toHaveBeenCalledWith(SESSION_ID);
    });

    it('desconecta si el usuario no existe', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const findUserById = vi.fn().mockResolvedValue(null);
      const { gateway } = makeGateway({ verifyAccessToken, findUserById });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('desconecta si el usuario está deshabilitado', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const findUserById = vi.fn().mockResolvedValue({ id: USER_ID, enabled: false });
      const { gateway } = makeGateway({ verifyAccessToken, findUserById });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('desconecta si la sesión no existe o ya no es usable (revocada/expirada)', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const findSessionById = vi.fn().mockResolvedValue({ userId: USER_ID, isUsable: () => false });
      const { gateway } = makeGateway({ verifyAccessToken, findSessionById });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('desconecta si la sesión pertenece a otro usuario', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const findSessionById = vi.fn().mockResolvedValue({ userId: 'otro-usuario', isUsable: () => true });
      const { gateway } = makeGateway({ verifyAccessToken, findSessionById });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('revalida la sesión periódicamente mientras el socket sigue conectado', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const findSessionById = vi.fn().mockResolvedValue({ userId: USER_ID, isUsable: () => true });
      const { gateway, sessions } = makeGateway({ verifyAccessToken, findSessionById });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      const callsAfterConnect = (sessions.findById as ReturnType<typeof vi.fn>).mock.calls.length;

      await vi.advanceTimersByTimeAsync(SESSION_REVALIDATION_INTERVAL_MS);
      expect((sessions.findById as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsAfterConnect);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('desconecta si la sesión se revoca mientras el socket sigue conectado', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const findSessionById = vi
        .fn()
        .mockResolvedValueOnce({ userId: USER_ID, isUsable: () => true })
        .mockResolvedValue({ userId: USER_ID, isUsable: () => false });
      const { gateway } = makeGateway({ verifyAccessToken, findSessionById });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      expect(client.disconnect).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(SESSION_REVALIDATION_INTERVAL_MS);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('limpia el temporizador de expiración y el intervalo de revalidación de sesión', async () => {
      const verifyAccessToken = vi.fn().mockResolvedValue(validPayload());
      const findSessionById = vi.fn().mockResolvedValue({ userId: USER_ID, isUsable: () => true });
      const { gateway, sessions } = makeGateway({ verifyAccessToken, findSessionById });
      const client = makeSocket('good-token');
      await gateway.handleConnection(client as any);
      const callsAfterConnect = (sessions.findById as ReturnType<typeof vi.fn>).mock.calls.length;

      gateway.handleDisconnect(client as any);
      await vi.advanceTimersByTimeAsync(SESSION_REVALIDATION_INTERVAL_MS * 2);

      expect((sessions.findById as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterConnect);
    });
  });

  describe('handleJoinRestaurant', () => {
    it('une la room cuando el scope permite acceder al restaurante', async () => {
      const canAccessRestaurant = vi.fn().mockResolvedValue(true);
      const { gateway } = makeGateway({ canAccessRestaurant });
      const client = makeSocket('good-token');
      client.data.auth = { userId: USER_ID, scopes: { organizations: [], restaurants: [RESTAURANT_ID] } };
      await gateway.handleJoinRestaurant(client as any, RESTAURANT_ID);
      expect(canAccessRestaurant).toHaveBeenCalledWith(client.data.auth, RESTAURANT_ID);
      expect(client.join).toHaveBeenCalledWith(`restaurant:${RESTAURANT_ID}`);
    });

    it('no une la room cuando el scope está vacío (anti-fuga multi-tenant)', async () => {
      const canAccessRestaurant = vi.fn().mockResolvedValue(false);
      const { gateway } = makeGateway({ canAccessRestaurant });
      const client = makeSocket('good-token');
      client.data.auth = { userId: USER_ID, scopes: { organizations: [], restaurants: [] } };
      await gateway.handleJoinRestaurant(client as any, RESTAURANT_ID);
      expect(client.join).not.toHaveBeenCalled();
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('no hace nada si el socket nunca completó la autenticación', async () => {
      const canAccessRestaurant = vi.fn();
      const { gateway } = makeGateway({ canAccessRestaurant });
      const client = makeSocket(undefined);
      await gateway.handleJoinRestaurant(client as any, RESTAURANT_ID);
      expect(canAccessRestaurant).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('deja la room del restaurante anterior antes de unirse a uno nuevo', async () => {
      const OTHER_RESTAURANT_ID = 'restaurant-otro';
      const canAccessRestaurant = vi.fn().mockResolvedValue(true);
      const { gateway } = makeGateway({ canAccessRestaurant });
      const client = makeSocket('good-token');
      client.data.auth = { userId: USER_ID, scopes: { organizations: [], restaurants: [RESTAURANT_ID, OTHER_RESTAURANT_ID] } };

      await gateway.handleJoinRestaurant(client as any, RESTAURANT_ID);
      expect(client.leave).not.toHaveBeenCalled();

      await gateway.handleJoinRestaurant(client as any, OTHER_RESTAURANT_ID);
      expect(client.leave).toHaveBeenCalledWith(`restaurant:${RESTAURANT_ID}`);
      expect(client.join).toHaveBeenCalledWith(`restaurant:${OTHER_RESTAURANT_ID}`);
      expect(client.data.joinedRestaurantId).toBe(OTHER_RESTAURANT_ID);
    });

    it('no deja ni vuelve a unir la room si se pide el mismo restaurante otra vez (idempotente)', async () => {
      const canAccessRestaurant = vi.fn().mockResolvedValue(true);
      const { gateway } = makeGateway({ canAccessRestaurant });
      const client = makeSocket('good-token');
      client.data.auth = { userId: USER_ID, scopes: { organizations: [], restaurants: [RESTAURANT_ID] } };

      await gateway.handleJoinRestaurant(client as any, RESTAURANT_ID);
      client.join.mockClear();

      await gateway.handleJoinRestaurant(client as any, RESTAURANT_ID);
      expect(client.leave).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('no deja la room anterior si el nuevo restaurante solicitado no está en scope', async () => {
      const OTHER_RESTAURANT_ID = 'restaurant-sin-scope';
      const canAccessRestaurant = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const { gateway } = makeGateway({ canAccessRestaurant });
      const client = makeSocket('good-token');
      client.data.auth = { userId: USER_ID, scopes: { organizations: [], restaurants: [RESTAURANT_ID] } };

      await gateway.handleJoinRestaurant(client as any, RESTAURANT_ID);
      await gateway.handleJoinRestaurant(client as any, OTHER_RESTAURANT_ID);

      expect(client.leave).not.toHaveBeenCalled();
      expect(client.data.joinedRestaurantId).toBe(RESTAURANT_ID);
    });
  });
});
