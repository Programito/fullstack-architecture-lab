import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../shared/events/domain-event';
import { RoleCreatedEvent } from './events/role-created.event';

export type RoleSnapshot = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  permissionIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

type CreateRoleProps = {
  name: string;
  description?: string | null;
  permissionIds?: string[];
};

export class Role {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private snapshot: RoleSnapshot) {}

  static create(props: CreateRoleProps): Role {
    const now = new Date();
    const role = new Role({
      id: randomUUID(),
      name: normalizeRoleName(props.name),
      description: props.description?.trim() || null,
      enabled: true,
      permissionIds: uniqueIds(props.permissionIds ?? []),
      createdAt: now,
      updatedAt: now,
    });

    role.record(new RoleCreatedEvent({ roleId: role.id, name: role.name }));

    return role;
  }

  static rehydrate(snapshot: RoleSnapshot): Role {
    return new Role({ ...snapshot, permissionIds: [...snapshot.permissionIds] });
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

  get permissionIds(): string[] {
    return [...this.snapshot.permissionIds];
  }

  get createdAt(): Date {
    return this.snapshot.createdAt;
  }

  get updatedAt(): Date {
    return this.snapshot.updatedAt;
  }

  pullDomainEvents(): DomainEvent[] {
    return this.domainEvents.splice(0);
  }

  setEnabled(enabled: boolean, now = new Date()): void {
    this.snapshot = { ...this.snapshot, enabled, updatedAt: now };
  }

  assignPermissions(permissionIds: string[], now = new Date()): void {
    this.snapshot = {
      ...this.snapshot,
      permissionIds: uniqueIds(permissionIds),
      updatedAt: now,
    };
  }

  toSnapshot(): RoleSnapshot {
    return { ...this.snapshot, permissionIds: [...this.snapshot.permissionIds] };
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}

export function normalizeRoleName(name: string): string {
  return name.trim().toLowerCase();
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
