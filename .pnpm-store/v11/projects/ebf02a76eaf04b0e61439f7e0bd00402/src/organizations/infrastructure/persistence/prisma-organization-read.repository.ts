import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { OrganizationReadRepository } from '../../application/ports/organization-read-repository.port';
import type { OrganizationSummary } from '../../domain/organization-summary.model';

@Injectable()
export class PrismaOrganizationReadRepository implements OrganizationReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizations(): Promise<OrganizationSummary[]> {
    return this.prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
