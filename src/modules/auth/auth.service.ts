import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConsultantService } from './consultant.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../notifications/services/notification.service';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { JwtPayload, TokenPayload } from './interfaces/auth.interface';
import { LoginUserDto } from './dto/login.dto';
import { LoginOrganizationDto } from './dto/login-organization.dto';
import { LoginType, LoginResponse } from './types/auth.types';
import { User, UserDocument } from './schemas/user.schema';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import { LogSeverity } from '../system-logs/schemas/system-log.schema';
import { Request } from 'express';
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/reset-password.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly systemLogsService: SystemLogsService,
    private readonly notificationService: NotificationService,
    private readonly consultantService: ConsultantService,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async login(
    loginDto: LoginUserDto | LoginOrganizationDto,
    req?: Request,
  ): Promise<LoginResponse> {
    try {
      if (loginDto.type === 'user') {
        if (!('email' in loginDto) || !('password' in loginDto)) {
          throw new UnauthorizedException('Invalid user login payload.');
        }
        return await this.loginUserFlow(loginDto as LoginUserDto, req);
      } else if (loginDto.type === 'organization') {
        if (!('email' in loginDto) || !('password' in loginDto)) {
          throw new UnauthorizedException(
            'Invalid organization login payload.',
          );
        }
        return await this.loginOrganizationFlow(
          loginDto as LoginOrganizationDto,
          req,
        );
      } else {
        throw new UnauthorizedException('Invalid login type.');
      }
    } catch (error) {
      throw error;
    }
  }

  private async loginUserFlow(
    loginDto: LoginUserDto,
    req?: Request,
  ): Promise<LoginResponse> {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      await this.systemLogsService.createLog(
        'Login Failed',
        `Failed login attempt: No account found with the provided email address.`,
        LogSeverity.WARNING,
        undefined,
        req,
      );
      throw new UnauthorizedException(
        'No account found with the provided email address.',
      );
    }

    if (!user.isEmailVerified || !user.isPhoneVerified) {
      await this.consultantService.resendVerificationPins(user.email);
      throw new HttpException(
        {
          message: 'Verification required',
          code: 'VERIFICATION_REQUIRED',
        },
        HttpStatus.PRECONDITION_REQUIRED, // 428
      );
    }
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      await this.systemLogsService.createLog(
        'Login Failed',
        `Failed login attempt: Incorrect password for user ${user.email}`,
        LogSeverity.WARNING,
        user.employeeId?.toString(),
        req,
      );
      throw new UnauthorizedException('The password you entered is incorrect.');
    }
    // if (user.status !== 'active') {
    //   await this.systemLogsService.createLog(
    //     'Login Failed',
    //     `Failed login attempt: Account status is ${user.status} for user ${user.email}`,
    //     LogSeverity.WARNING,
    //     user.employeeId?.toString(),
    //     req,
    //   );
    //   throw new UnauthorizedException(
    //     `Your account is ${user.status}. Please contact support for assistance.`,
    //   );
    // }
    const token = await this.generateToken(user as UserDocument);
    await this.systemLogsService.createLog(
      'Login Success',
      `User logged in successfully: ${user.email}`,
      LogSeverity.INFO,
      user.employeeId?.toString(),
      req,
    );
    return {
      user: this.sanitizeUser(user as UserDocument),
      token: token.token,
      type: 'user',
    };
  }

  private async loginOrganizationFlow(
    loginDto: LoginOrganizationDto,
    req?: Request,
  ): Promise<LoginResponse> {
    const organization = await this.organizationModel
      .findOne({ businessEmail: loginDto.email })
      .select('+password')
      .exec();
    if (!organization) {
      await this.systemLogsService.createLog(
        'Login Failed',
        `Failed login attempt: No organization found with the provided email address.`,
        LogSeverity.WARNING,
        undefined,
        req,
      );
      throw new UnauthorizedException(
        'No organization found with the provided email address.',
      );
    }

    if (!organization.isEmailVerified || !organization.isPhoneVerified) {
      await this.consultantService.resendCompanyVerificationPins(
        organization.businessEmail,
      );
      throw new HttpException(
        {
          message: 'Verification required',
          code: 'VERIFICATION_REQUIRED',
        },
        HttpStatus.PRECONDITION_REQUIRED, // 428
      );
    }
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      organization.password,
    );
    if (!isPasswordValid) {
      await this.systemLogsService.createLog(
        'Login Failed',
        `Failed login attempt: Incorrect password for organization ${organization.businessEmail}`,
        LogSeverity.WARNING,
        organization.organizationId,
        req,
      );
      throw new UnauthorizedException('The password you entered is incorrect.');
    }
    // if (organization.status !== 'active') {
    //   await this.systemLogsService.createLog(
    //     'Login Failed',
    //     `Failed login attempt: Account status is ${organization.status} for organization ${organization.businessEmail}`,
    //     LogSeverity.WARNING,
    //     organization.organizationId,
    //     req,
    //   );
    //   throw new UnauthorizedException(
    //     `Your organization account is ${organization.status}. Please contact support for assistance.`,
    //   );
    // }
    const token = await this.generateOrganizationToken(
      organization as OrganizationDocument,
    );
    await this.systemLogsService.createLog(
      'Login Success',
      `Organization logged in successfully: ${organization.businessEmail}`,
      LogSeverity.INFO,
      organization.organizationId,
      req,
    );
    const { password, ...orgData } = organization.toObject();
    return {
      user: orgData,
      token: token.token,
      type: 'organization',
    };
  }

  private async generateOrganizationToken(
    organization: OrganizationDocument,
  ): Promise<TokenPayload> {
    const payload = {
      sub: organization._id.toString(),
      businessEmail: organization.businessEmail,
      isEmailVerified: organization.isEmailVerified,
      isPhoneVerified: organization.isPhoneVerified,
      companyName: organization.companyName,
      registrationStatus: organization.registrationStatus,
      status: organization.status,
    };
    const token = this.jwtService.sign(payload);
    return {
      token,
      expiresIn: 24 * 60 * 60,
    };
  }

  async requestPasswordReset(
    requestPasswordResetDto: RequestPasswordResetDto,
    req?: Request,
  ): Promise<{ message: string }> {
    const { email, type } = requestPasswordResetDto;
    try {
      let account: any = null;
      let identifier: string | undefined = undefined;
      if (type === 'user') {
        account = await this.userService.findByEmail(email);
        identifier = account?.employeeId?.toString();
      } else if (type === 'organization') {
        account = await this.organizationModel.findOne({
          businessEmail: email,
        });
        identifier = account?.organizationId;
      }
      if (!account) {
        await this.systemLogsService.createLog(
          'SRCC Password Reset Request Failed',
          `Password reset attempt for non-existent email: ${email}`,
          LogSeverity.WARNING,
          undefined,
          req,
        );
        return {
          message:
            'SRCC: If your email is registered, you will receive a password reset PIN.',
        };
      }

      const resetPin = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryDate = new Date(Date.now() + 10 * 60 * 1000);

      account.resetPin = resetPin;
      account.resetPinExpires = expiryDate;
      await account.save();

      const resetMessage = `Your SRCC password reset PIN is: ${resetPin}. This PIN will expire in 10 minutes. Please keep this PIN secure and do not share it with anyone.`;
      // Send to phone/email for user, businessPhone/businessEmail for org
      const phone =
        type === 'user' ? account.phoneNumber : account.businessPhone;
      const targetEmail =
        type === 'user' ? account.email : account.businessEmail;
      await this.notificationService.sendRegistrationPin(
        phone,
        targetEmail,
        resetMessage,
      );

      await this.systemLogsService.createLog(
        'SRCC Password Reset Requested',
        `Password reset PIN generated for ${type}: ${targetEmail}`,
        LogSeverity.INFO,
        identifier,
        req,
      );

      return {
        message:
          'SRCC: If your email is registered, you will receive a password reset PIN.',
      };
    } catch (error) {
      await this.systemLogsService.createLog(
        'SRCC Password Reset Request Error',
        `Error during password reset request for ${email}: ${error.message}`,
        LogSeverity.ERROR,
        undefined,
        req,
      );
      console.log(error);
      throw new BadRequestException(
        'SRCC: Could not process password reset request. Please try again later.',
      );
    }
  }

  async confirmPasswordReset(
    confirmPasswordResetDto: ConfirmPasswordResetDto,
    req?: Request,
  ): Promise<{ message: string }> {
    const { email, resetToken, newPassword, type } = confirmPasswordResetDto;
    try {
      let account: any = null;
      let identifier: string | undefined = undefined;
      let displayName = '';
      let targetEmail = email;
      if (type === 'user') {
        account = await this.userService.findByEmail(email);
        identifier = account?.employeeId?.toString();
        displayName = `${account?.firstName ?? ''} ${account?.lastName ?? ''} (${account?.email ?? ''})`;
      } else if (type === 'organization') {
        account = await this.organizationModel.findOne({
          businessEmail: email,
        });
        identifier = account?.organizationId;
        displayName = `${account?.companyName ?? ''} (${account?.businessEmail ?? ''})`;
        targetEmail = account?.businessEmail;
      }

      if (!account || !account.resetPin || !account.resetPinExpires) {
        throw new BadRequestException(
          'SRCC: Invalid or expired password reset PIN.',
        );
      }

      if (account.resetPinExpires < new Date()) {
        await this.systemLogsService.createLog(
          'SRCC Password Reset PIN Expired',
          `Expired PIN used for ${targetEmail}`,
          LogSeverity.WARNING,
          identifier,
          req,
        );
        throw new BadRequestException('SRCC: Password reset PIN has expired.');
      }

      if (account.resetPin !== resetToken) {
        throw new BadRequestException('SRCC: Invalid password reset PIN.');
      }

      // Hash
      account.password = await bcrypt.hash(newPassword, 10);
      account.resetPin = undefined;
      account.resetPinExpires = undefined;
      await account.save();

      await this.systemLogsService.createLog(
        'SRCC Password Reset Confirmed',
        `Password successfully reset for ${type}: ${displayName}`,
        LogSeverity.INFO,
        identifier,
        req,
      );

      return { message: 'SRCC: Your password has been successfully reset.' };
    } catch (error) {
      await this.systemLogsService.createLog(
        'SRCC Password Reset Confirmation Failed',
        `Error confirming password reset for ${email}: ${error.message}`,
        LogSeverity.ERROR,
        undefined,
        req,
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'SRCC: Could not reset password. Please try again.',
      );
    }
  }

  async suspendUser(
    email: string,
    type: LoginType,
  ): Promise<{ message: string }> {
    let account = null;
    let identifier: string | undefined;
    let targetEmail: string;
    let targetPhone: string;

    if (type === 'user') {
      account = await this.userService.findByEmail(email);
      if (account) {
        identifier = account.employeeId?.toString();
        targetEmail = account.email;
        targetPhone = account.phoneNumber;
      }
    } else if (type === 'organization') {
      account = await this.organizationModel.findOne({ businessEmail: email });
      if (account) {
        identifier = account.organizationId;
        targetEmail = account.businessEmail;
        targetPhone = account.businessPhone;
      }
    }

    if (!account) {
      throw new NotFoundException(
        `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
      );
    }

    account.status = 'suspended';
    await account.save();

    await this.systemLogsService.createLog(
      'Account Suspended',
      `${type.charAt(0).toUpperCase() + type.slice(1)} account suspended: ${targetEmail}`,
      LogSeverity.WARNING,
      identifier,
      undefined,
    );

    await this.notificationService.sendEmail(
      targetEmail,
      'Account Suspended',
      'Your SRCC account has been suspended. Please contact support for more information.',
    );

    return {
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${targetEmail} has been suspended.`,
    };
  }

  async activateUser(
    email: string,
    type: LoginType,
  ): Promise<{ message: string }> {
    let account = null;
    let identifier: string | undefined;
    let targetEmail: string;
    let targetPhone: string;

    if (type === 'user') {
      account = await this.userService.findByEmail(email);
      if (account) {
        identifier = account.employeeId?.toString();
        targetEmail = account.email;
        targetPhone = account.phoneNumber;
      }
    } else if (type === 'organization') {
      account = await this.organizationModel.findOne({ businessEmail: email });
      if (account) {
        identifier = account.organizationId;
        targetEmail = account.businessEmail;
        targetPhone = account.businessPhone;
      }
    }

    if (!account) {
      throw new NotFoundException(
        `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
      );
    }

    account.status = 'active';
    await account.save();

    await this.systemLogsService.createLog(
      'Account Activated',
      `${type.charAt(0).toUpperCase() + type.slice(1)} account activated: ${targetEmail}`,
      LogSeverity.INFO,
      identifier,
      undefined,
    );

    await this.notificationService.sendEmail(
      targetEmail,
      'Account Activated',
      'Your SRCC account has been reactivated. You may now log in.',
    );

    return {
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${targetEmail} has been reactivated.`,
    };
  }

  private async generateToken(user: UserDocument): Promise<TokenPayload> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      position: user.position,
      department: user.department,
      registrationStatus: user.registrationStatus,
      phoneNumber: user.phoneNumber,
      status: user.status,
    };
    const token = this.jwtService.sign(payload);
    return {
      token,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  sanitizeUser(user: UserDocument): any {
    const { password, ...userWithoutPassword } = user.toObject();
    return {
      ...userWithoutPassword,
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      status: user.status,
      registrationStatus: user.registrationStatus || 'complete',
      isPhoneVerified: user.isPhoneVerified || false,
      isEmailVerified: user.isEmailVerified || false,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: user.permissions,
    };
  }



  async getUserProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user as UserDocument);
  }

  async updateUserPermissions(
    userId: string,
    permissions: Record<string, string[]>,
  ): Promise<Partial<User>> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update only the permissions field
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { permissions } },
      { new: true, runValidators: true }
    ).exec();
    
    return this.sanitizeUser(updatedUser as UserDocument);
  }
}
