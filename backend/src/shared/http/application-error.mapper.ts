import { BadRequestException, ConflictException, HttpException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import type { ApplicationError } from '../errors/application-error';
import type { Result } from '../result/result';
import { isOk } from '../result/result';

export function unwrapResultOrThrow<T>(result: Result<T, ApplicationError>): T {
  if (isOk(result)) {
    return result.value;
  }

  throw toHttpException(result.error);
}

export function toHttpException(error: ApplicationError): HttpException {
  switch (error.code) {
    case 'invalid_email':
    case 'invalid_password':
    case 'invalid_user_name':
    case 'invalid_role_name':
      return new BadRequestException(error.message);

    case 'user_not_found':
    case 'role_not_found':
    case 'task_not_found':
      return new NotFoundException(error.message);

    case 'email_already_taken':
    case 'role_name_already_taken':
      return new ConflictException(error.message);

    default:
      return new InternalServerErrorException('Unexpected application error.');
  }
}
