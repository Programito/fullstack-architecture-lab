import { randomUUID } from 'node:crypto';

export type PermissionSnapshot = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CreatePermissionProps = {
  name: string;
  description?: string | null;
};

export class Permission {
  private constructor(private snapshot: PermissionSnapshot) {}

  static create(props: CreatePermissionProps): Permission {
    const now = new Date();
    return new Permission({
      id: randomUUID(),
      name: normalizePermissionName(props.name),
      description: props.description?.trim() || null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(snapshot: PermissionSnapshot): Permission {
    return new Permission(snapshot);
  }

  get id(): string {
    return this.snapshot.id;
  }

  get name(): string {
    return this.snapshot.name;
  }

  get description(): string | null {
    return this.snapshot.description;
  }

  get enabled(): boolean {
    return this.snapshot.enabled;
  }

  get createdAt(): Date {
    return this.snapshot.createdAt;
  }

  get updatedAt(): Date {
    return this.snapshot.updatedAt;
  }

  setEnabled(enabled: boolean, now = new Date()): void {
    this.snapshot = { ...this.snapshot, enabled, updatedAt: now };
  }

  toSnapshot(): PermissionSnapshot {
    return { ...this.snapshot };
  }
}

export function normalizePermissionName(name: string): string {
  return name.trim().toLowerCase();
}
