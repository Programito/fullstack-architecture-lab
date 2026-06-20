import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../shared/events/domain-event';
import { UserCreatedEvent } from './events/user-created.event';
import { UserRolesAssignedEvent } from './events/user-roles-assigned.event';

export type UserSnapshot = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  enabled: boolean;
  roleIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

type CreateUserProps = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roleIds?: string[];
};

export class User {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private snapshot: UserSnapshot) {}

  static create(props: CreateUserProps): User {
    const now = new Date();
    const user = new User({
      id: randomUUID(),
      email: props.email,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      passwordHash: props.passwordHash,
      enabled: true,
      roleIds: uniqueIds(props.roleIds ?? []),
      createdAt: now,
      updatedAt: now,
    });

    user.record(new UserCreatedEvent({ userId: user.id, email: user.email }));

    if (user.roleIds.length > 0) {
      user.record(new UserRolesAssignedEvent({ userId: user.id, roleIds: user.roleIds }));
    }

    return user;
  }

  static rehydrate(snapshot: UserSnapshot): User {
    return new User({ ...snapshot, roleIds: [...snapshot.roleIds] });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get email(): string {
    return this.snapshot.email;
  }

  get firstName(): string {
    return this.snapshot.firstName;
  }

  get lastName(): string {
    return this.snapshot.lastName;
  }

  get passwordHash(): string {
    return this.snapshot.passwordHash;
  }

  get enabled(): boolean {
    return this.snapshot.enabled;
  }

  get roleIds(): string[] {
    return [...this.snapshot.roleIds];
  }

  get createdAt(): Date {
    return this.snapshot.createdAt;
  }

  get updatedAt(): Date {
    return this.snapshot.updatedAt;
  }

  assignRoles(roleIds: string[], now = new Date()): void {
    this.snapshot = {
      ...this.snapshot,
      roleIds: uniqueIds(roleIds),
      updatedAt: now,
    };
    this.record(new UserRolesAssignedEvent({ userId: this.id, roleIds: this.roleIds }));
  }

  setEnabled(enabled: boolean, now = new Date()): void {
    this.snapshot = { ...this.snapshot, enabled, updatedAt: now };
  }

  pullDomainEvents(): DomainEvent[] {
    return this.domainEvents.splice(0);
  }

  toSnapshot(): UserSnapshot {
    return { ...this.snapshot, roleIds: [...this.snapshot.roleIds] };
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
