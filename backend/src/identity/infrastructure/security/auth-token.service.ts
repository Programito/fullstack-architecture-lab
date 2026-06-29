import { createHash, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export type TokenType = 'access' | 'refresh';
export type AuthTokenPayload = {
  sub: string;
  sid: string;
  roles?: string[];
  permissions?: string[];
  scopes?: {
    organizations: string[];
    restaurants: string[];
  };
  type: TokenType;
  jti: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
};

@Injectable()
export class AuthTokenService {
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
  readonly absoluteRefreshTtlSeconds: number;
  readonly issuer: string;
  readonly audience: string;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(private readonly jwt: JwtService, config: ConfigService) {
    this.accessSecret = requiredSecret(config, 'JWT_ACCESS_SECRET');
    this.refreshSecret = requiredSecret(config, 'JWT_REFRESH_SECRET');
    this.issuer = config.get<string>('JWT_ISSUER') ?? 'proyecto-api';
    this.audience = config.get<string>('JWT_AUDIENCE') ?? 'proyecto-frontend';
    this.accessTtlSeconds = positiveNumber(config, 'JWT_ACCESS_TTL_SECONDS', 900);
    this.refreshTtlSeconds = positiveNumber(config, 'JWT_REFRESH_TTL_SECONDS', 604800);
    this.absoluteRefreshTtlSeconds = positiveNumber(config, 'JWT_REFRESH_ABSOLUTE_TTL_SECONDS', 2592000);
  }

  issueAccessToken(
    userId: string,
    sessionId: string,
    roles: string[],
    permissions: string[],
    scopes: { organizations: string[]; restaurants: string[] },
  ): Promise<string> {
    return this.sign(
      { sub: userId, sid: sessionId, roles, permissions, scopes, type: 'access', jti: randomUUID() },
      'access',
    );
  }

  issueRefreshToken(userId: string, sessionId: string): Promise<string> {
    return this.sign({ sub: userId, sid: sessionId, type: 'refresh', jti: randomUUID() }, 'refresh');
  }

  verifyAccessToken(token: string): Promise<AuthTokenPayload> {
    return this.verify(token, 'access');
  }

  verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    return this.verify(token, 'refresh');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sign(payload: AuthTokenPayload, type: TokenType): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: type === 'access' ? this.accessSecret : this.refreshSecret,
      expiresIn: type === 'access' ? this.accessTtlSeconds : this.refreshTtlSeconds,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  private async verify(token: string, expectedType: TokenType): Promise<AuthTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token, {
        secret: expectedType === 'access' ? this.accessSecret : this.refreshSecret,
        issuer: this.issuer,
        audience: this.audience,
      });
      if (payload.type !== expectedType || !payload.sub || !payload.sid || !payload.jti) {
        throw new Error('Invalid claims');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}

function requiredSecret(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (!value || value.length < 32) throw new Error(`${key} must contain at least 32 characters.`);
  return value;
}

function positiveNumber(config: ConfigService, key: string, fallback: number): number {
  const value = Number(config.get<string>(key) ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${key} must be a positive number.`);
  return value;
}
