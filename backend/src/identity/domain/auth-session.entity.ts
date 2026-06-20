import { randomUUID } from 'node:crypto';

export type AuthSessionSnapshot = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  enabled: boolean;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class AuthSession {
  private constructor(private snapshot: AuthSessionSnapshot) {}

  static create(props: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    absoluteExpiresAt: Date;
  }): AuthSession {
    const now = new Date();
    return new AuthSession({
      id: randomUUID(),
      userId: props.userId,
      refreshTokenHash: props.refreshTokenHash,
      enabled: true,
      expiresAt: props.expiresAt,
      absoluteExpiresAt: props.absoluteExpiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(snapshot: AuthSessionSnapshot): AuthSession {
    return new AuthSession({ ...snapshot });
  }

  get id(): string { return this.snapshot.id; }
  get userId(): string { return this.snapshot.userId; }
  get refreshTokenHash(): string { return this.snapshot.refreshTokenHash; }
  get enabled(): boolean { return this.snapshot.enabled; }
  get expiresAt(): Date { return this.snapshot.expiresAt; }
  get absoluteExpiresAt(): Date { return this.snapshot.absoluteExpiresAt; }
  get revokedAt(): Date | null { return this.snapshot.revokedAt; }
  get createdAt(): Date { return this.snapshot.createdAt; }
  get updatedAt(): Date { return this.snapshot.updatedAt; }

  rotate(refreshTokenHash: string, expiresAt: Date, now = new Date()): void {
    this.snapshot = { ...this.snapshot, refreshTokenHash, expiresAt, updatedAt: now };
  }

  setEnabled(enabled: boolean, now = new Date()): void {
    this.snapshot = {
      ...this.snapshot,
      enabled,
      revokedAt: enabled ? null : (this.snapshot.revokedAt ?? now),
      updatedAt: now,
    };
  }

  isUsable(now = new Date()): boolean {
    return this.enabled && !this.revokedAt && this.expiresAt > now && this.absoluteExpiresAt > now;
  }

  toSnapshot(): AuthSessionSnapshot {
    return { ...this.snapshot };
  }
}
