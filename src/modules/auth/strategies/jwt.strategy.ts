import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user.service';
import { AuthService } from '../auth.service';
import { UserSuspendedException } from '../exceptions/user-suspended.exception';
import { UserInactiveException } from '../exceptions/user-inactive.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly userService: UserService,
    secretOrKey: string,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      this.logger.warn(
        `Authentication failed: User not found (ID: ${payload.sub})`,
      );
      throw new UnauthorizedException('User not found');
    }

    // Check user status and throw appropriate exceptions
    if (user.status === 'suspended') {
      this.logger.warn(
        `Access denied: User ${user.email} (ID: ${user?.email}) is suspended`,
      );
      throw new UserSuspendedException(
        'Your account has been suspended. Please contact the administrator for more information.',
      );
    }

    if (user.status === 'terminated') {
      this.logger.warn(
        `Access denied: User ${user.email} (ID: ${user.email}) is terminated`,
      );
      throw new UserInactiveException(
        'Your account has been terminated. Please contact the administrator.',
      );
    }

    if (user.status === 'inactive') {
      this.logger.warn(
        `Access denied: User ${user.email} (ID: ${user.email}) is inactive`,
      );
      throw new UserInactiveException(
        'Your account is inactive. Please complete your registration or contact the administrator.',
      );
    }

    // After validating the user exists and is active, we return the
    // original payload. The payload contains all the necessary user
    // information (including roles) for the request lifecycle.
    return payload;
  }
}
