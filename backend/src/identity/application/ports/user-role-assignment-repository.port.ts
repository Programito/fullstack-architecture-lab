export type UserRoleAssignmentScope = 'organization' | 'restaurant';

export type UserRoleAssignmentRecord = {
  id: string;
  userId: string;
  roleId: string;
  scopeType: UserRoleAssignmentScope;
  organizationId: string | null;
  restaurantId: string | null;
};

export type UserRestaurantScope = {
  organizationId: string;
  restaurantId: string | null;
};

export interface UserRoleAssignmentRepository {
  findByUserId(userId: string): Promise<UserRoleAssignmentRecord[]>;
  replaceScopeForUser(userId: string, roleIds: string[], scope: UserRestaurantScope): Promise<void>;
}

export const USER_ROLE_ASSIGNMENT_REPOSITORY = Symbol('USER_ROLE_ASSIGNMENT_REPOSITORY');
