import type { AccountType } from '../api/identity-api.models';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  accountType: AccountType;
  roleIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: string[];
}
