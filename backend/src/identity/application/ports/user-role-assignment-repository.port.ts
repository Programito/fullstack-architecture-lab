export type UserRoleAssignmentScope = 'organization' | 'restaurant';

export type UserRoleAssignmentRecord = {
  id: string;
  userId: string;
  roleId: string;
  scopeType: UserRoleAssignmentScope;
  organizationId: string | null;
  restaurantId: string | null;
};

export interface UserRoleAssignmentRepository {
  findByUserId(userId: string): Promise<UserRoleAssignmentRecord[]>;
}

export const USER_ROLE_ASSIGNMENT_REPOSITORY = Symbol('USER_ROLE_ASSIGNMENT_REPOSITORY');
