import { Injectable } from '@nestjs/common';

import type { UserRepository } from '../../application/ports/user-repository.port';
import { User } from '../../domain/user.entity';

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id, User.rehydrate(user.toSnapshot()));
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);

    return user ? User.rehydrate(user.toSnapshot()) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = [...this.users.values()].find((candidate) => candidate.email === normalizedEmail);

    return user ? User.rehydrate(user.toSnapshot()) : null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users.values()]
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((user) => User.rehydrate(user.toSnapshot()));
  }

  clear(): void {
    this.users.clear();
  }
}
