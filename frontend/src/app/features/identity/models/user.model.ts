export interface User {
  id: string;
  email: string;
  name: string;
  roleIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  roleIds?: string[];
}
