import { ObservabilityRetentionRunner } from './observability-retention.runner';
import { ObservabilityService } from './observability.service';

describe('ObservabilityRetentionRunner', () => {
  it('runs purgeExpired from the explicit retention runner', async () => {
    const purgeExpired = vi.fn().mockResolvedValue(undefined);
    const runner = new ObservabilityRetentionRunner({ purgeExpired } as unknown as ObservabilityService);

    await runner.run();

    expect(purgeExpired).toHaveBeenCalledTimes(1);
  });
});
