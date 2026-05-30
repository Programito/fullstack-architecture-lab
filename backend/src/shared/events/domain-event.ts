export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}
