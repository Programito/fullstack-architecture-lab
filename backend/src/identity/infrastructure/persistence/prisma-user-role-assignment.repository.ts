import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { UserRoleAssignmentRecord, UserRoleAssignmentRepository } from '../../application/ports/user-role-assignment-repository.port';

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
}
