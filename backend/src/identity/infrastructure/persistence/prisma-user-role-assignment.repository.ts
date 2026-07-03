import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  UserRestaurantScope,
  UserRoleAssignmentRecord,
  UserRoleAssignmentRepository,
} from '../../application/ports/user-role-assignment-repository.port';

@Injectable()
export class PrismaUserRoleAssignmentRepository implements UserRoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserRoleAssignmentRecord[]> {
    return this.prisma.userRoleAssignment.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        roleId: true,
        scopeType: true,
        organizationId: true,
        restaurantId: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async replaceScopeForUser(userId: string, roleIds: string[], scope: UserRestaurantScope): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.deleteMany({ where: { userId } });
      await tx.userRoleAssignment.createMany({
        data: roleIds.map((roleId) => ({
          userId,
          roleId,
          scopeType: scope.restaurantId ? ('restaurant' as const) : ('organization' as const),
          organizationId: scope.organizationId,
          restaurantId: scope.restaurantId,
        })),
      });
    });
  }
}
