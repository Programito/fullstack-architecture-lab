import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ObservabilityRetentionService {
  readonly logRetentionDays: number;
  readonly auditRetentionDays: number;

  constructor(private readonly config: ConfigService) {
    this.logRetentionDays = this.readPositiveInteger('LOG_RETENTION_DAYS', 30);
    this.auditRetentionDays = this.readPositiveInteger('AUDIT_RETENTION_DAYS', 365);
  }

  private readPositiveInteger(name: string, fallback: number): number {
    const raw = this.config.get<string>(name);
    if (!raw || raw.trim().length === 0) return fallback;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${name} must be a positive integer.`);
    }

    return parsed;
  }
}
