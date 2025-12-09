import { HttpException, HttpStatus } from '@nestjs/common';

export class UserSuspendedException extends HttpException {
  constructor(
    message = 'Your account has been suspended. Please contact the administrator.',
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Account Suspended',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
