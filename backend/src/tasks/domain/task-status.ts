export const TASK_STATUSES = ['pending', 'completed'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
