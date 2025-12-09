import { HttpException, HttpStatus } from '@nestjs/common';

export class UserInactiveException extends HttpException {
  constructor(
    message = 'Your account is not active. Please complete registration or contact the administrator.',
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Account Inactive',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
