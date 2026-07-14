import { ConfigService } from '@nestjs/config';

import { ObservabilityRetentionService } from './observability-retention.service';

describe('ObservabilityRetentionService', () => {
  it('uses defaults when env vars are missing', () => {
    const service = new ObservabilityRetentionService(new ConfigService({}));

    expect(service.logRetentionDays).toBe(30);
    expect(service.auditRetentionDays).toBe(365);
  });

  it('reads positive integers from config', () => {
    const service = new ObservabilityRetentionService(new ConfigService({
      LOG_RETENTION_DAYS: '14',
      AUDIT_RETENTION_DAYS: '45',
    }));

    expect(service.logRetentionDays).toBe(14);
    expect(service.auditRetentionDays).toBe(45);
  });

  it('throws when a retention value is not a positive integer', () => {
    expect(() => new ObservabilityRetentionService(new ConfigService({
      LOG_RETENTION_DAYS: '0',
    }))).toThrow('LOG_RETENTION_DAYS must be a positive integer.');
  });
});
