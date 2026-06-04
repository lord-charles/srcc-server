import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user.service';
import { OrganizationService } from '../organization.service';
import { UserSuspendedException } from '../exceptions/user-suspended.exception';
import { UserInactiveException } from '../exceptions/user-inactive.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    secretOrKey: string,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: any) {
    let entity: any = null;
    let isOrganization = false;
    // Try to find the user in the UserService first
    try {
      entity = await this.userService.findById(payload.sub);
    } catch (error) {
      // If not found in users, try searching in organizations
      entity = await this.organizationService.findById(payload.sub);
      if (entity) {
        isOrganization = true;
      }
    }

    if (!entity) {
      this.logger.warn(
        `Authentication failed: Entity not found (ID: ${payload.sub})`,
      );
      throw new UnauthorizedException('User not found');
    }

    const email = isOrganization ? entity.businessEmail : entity.email;
    // Check status and throw appropriate exceptions
    if (entity.status === 'suspended') {
      this.logger.warn(
        `Access denied: ${isOrganization ? 'Organization' : 'User'} ${email} (ID: ${email}) is suspended`,
      );
      throw new UserSuspendedException(
        'Your account has been suspended. Please contact the administrator for more information.',
      );
    }

    if (entity.status === 'terminated') {
      this.logger.warn(
        `Access denied: ${isOrganization ? 'Organization' : 'User'} ${email} (ID: ${email}) is terminated`,
      );
      throw new UserInactiveException(
        'Your account has been terminated. Please contact the administrator.',
      );
    }

    if (entity.status === 'inactive') {
      this.logger.warn(
        `Access denied: ${isOrganization ? 'Organization' : 'User'} ${email} (ID: ${email}) is inactive`,
      );
      throw new UserInactiveException(
        'Your account is inactive. Please complete your registration or contact the administrator.',
      );
    }

    // Attach sub to the Mongoose document so that req.user.sub works
    (entity as any).sub = payload.sub;

    return entity;
  }
}
