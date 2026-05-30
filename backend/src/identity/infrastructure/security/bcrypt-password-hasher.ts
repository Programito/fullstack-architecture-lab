import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

import type { PasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds = 12;

  async hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, this.saltRounds);
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return compare(plainPassword, passwordHash);
  }
}
