import { Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../shared/prisma/prisma.service';
import { seedDemoUsers } from '../../prisma/seeds/demo-users.seed';
import { seedMesaFlowDemo } from '../../prisma/seeds/mesaflow-demo.seed';
import { seedMesaFlowLayoutDemo } from '../../prisma/seeds/mesaflow-layout.seed';
import { seedMesaFlowOrdersDemo } from '../../prisma/seeds/mesaflow-orders.seed';
import { seedMesaFlowReservationsDemo } from '../../prisma/seeds/mesaflow-reservations.seed';
import { seedPermissions } from '../../prisma/seeds/permissions.seed';
import { seedRoles } from '../../prisma/seeds/roles.seed';

@ApiTags('developer')
@Controller('developer')
export class SeedController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('seed')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Runs the full demo seed against the active database.',
    schema: { example: { seeded: true } },
  })
  async runSeed(): Promise<{ seeded: boolean }> {
    await seedPermissions(this.prisma);
    await seedRoles(this.prisma);
    await seedMesaFlowDemo(this.prisma);
    await seedDemoUsers(this.prisma);
    await seedMesaFlowLayoutDemo(this.prisma);
    await seedMesaFlowOrdersDemo(this.prisma);
    await seedMesaFlowReservationsDemo(this.prisma);
    return { seeded: true };
  }
}
