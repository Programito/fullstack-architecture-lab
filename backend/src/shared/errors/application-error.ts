export type ApplicationErrorCode =
  | 'invalid_email'
  | 'email_already_taken'
  | 'user_not_found'
  | 'role_not_found'
  | 'permission_not_found'
  | 'role_name_already_taken'
  | 'invalid_password'
  | 'invalid_user_name'
  | 'invalid_role_name'
  | 'task_not_found';

export type ApplicationError = {
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
};

export function applicationError(
  code: ApplicationErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApplicationError {
  return details ? { code, message, details } : { code, message };
}

export function taskNotFound(taskId: string): ApplicationError {
  return applicationError('task_not_found', `Task "${taskId}" was not found.`, { taskId });
}
