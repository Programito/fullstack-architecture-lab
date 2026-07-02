import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

import { ObservabilityService } from './observability.service';

@Injectable()
export class ObservabilityRetentionRunner implements OnApplicationBootstrap, OnModuleDestroy {
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(private readonly observability: ObservabilityService) {}

  onApplicationBootstrap(): void {
    this.intervalHandle = setInterval(() => {
      void this.run();
    }, 60 * 60 * 1000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async run(): Promise<void> {
    await this.observability.purgeExpired(new Date());
  }
}
