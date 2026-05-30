export type AppErrorType =
  | 'network'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'unexpected';

export interface AppError {
  readonly type: AppErrorType;
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
  readonly fields?: Record<string, string[]>;
  readonly details?: unknown;
}
