import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notifications/services/notification.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/user.dto';
import { LoginUserDto } from './dto/login.dto';
import {
  JwtPayload,
  AuthResponse,
  TokenPayload,
} from './interfaces/auth.interface';
import { User, UserDocument } from './schemas/user.schema';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import { LogSeverity } from '../system-logs/schemas/system-log.schema';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly systemLogsService: SystemLogsService,
    private readonly notificationService: NotificationService,
  ) { }

  private generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(dto.email) as UserDocument;
    if (!user) throw new BadRequestException('User not found');
    const pin = this.generatePin();
    user.resetPin = pin;
    await user.save();
    const msg = `Your new SRCC registration PIN is: ${pin}`;
    await this.notificationService.sendRegistrationPin(user.phoneNumber, user.email, msg);
    return { message: 'A new registration PIN has been sent to your email and phone.' };

  }

  async login(
    loginUserDto: LoginUserDto,
    req?: Request,
  ): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.userService.findByEmail(loginUserDto.email);

      if (!user) {
        await this.systemLogsService.createLog(
          'Login Failed',
          `Failed login attempt with email: ${loginUserDto.email}`,
          LogSeverity.WARNING,
          undefined,
          req,
        );
        throw new UnauthorizedException('No account found with the provided email address.');
      }

      // Require PIN for authentication based on user status
      if (user.status === 'pending') {
        if (!loginUserDto.pin || loginUserDto.pin !== user.registrationPin) {
          await this.systemLogsService.createLog(
            'Login Failed',
            `Invalid registration PIN attempt for pending user: ${user.email}`,
            LogSeverity.WARNING,
            user.employeeId?.toString(),
            req,
          );
          throw new UnauthorizedException('The registration PIN you entered is incorrect or missing.');
        }
      } else if (user.status === 'active') {
        if (!loginUserDto.pin || loginUserDto.pin !== user.resetPin) {
          await this.systemLogsService.createLog(
            'Login Failed',
            `Invalid login PIN attempt for active user: ${user.email}`,
            LogSeverity.WARNING,
            user.employeeId?.toString(),
            req,
          );
          throw new UnauthorizedException('The login PIN you entered is incorrect or missing.');
        }
      } else {
        // Handle account status
        switch (user.status) {
          case 'inactive':
            await this.systemLogsService.createLog(
              'Inactive Account Login Attempt',
              `Login attempt for inactive account: ${user.email}`,
              LogSeverity.WARNING,
              user.employeeId?.toString(),
              req,
            );
            throw new UnauthorizedException('Your account is inactive. Please contact support for assistance.');
          case 'suspended':
            await this.systemLogsService.createLog(
              'Suspended Account Login Attempt',
              `Login attempt for suspended account: ${user.email}`,
              LogSeverity.WARNING,
              user.employeeId?.toString(),
              req,
            );
            throw new UnauthorizedException('Your account has been suspended. Please contact support for more information.');
          case 'terminated':
            await this.systemLogsService.createLog(
              'Terminated Account Login Attempt',
              `Login attempt for terminated account: ${user.email}`,
              LogSeverity.WARNING,
              user.employeeId?.toString(),
              req,
            );
            throw new UnauthorizedException('Your account has been terminated.');
          default:
            await this.systemLogsService.createLog(
              'Unknown Status Login Attempt',
              `Login attempt for account with unknown status (${user.status}): ${user.email}`,
              LogSeverity.WARNING,
              user.employeeId?.toString(),
              req,
            );
            throw new UnauthorizedException('Account status is not recognized. Please contact support.');
        }
      }

      // Generate token
      const token = await this.generateToken(user as UserDocument);

      // Log successful login
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
      };
    } catch (error) {
      throw error;
    }
  }

  async suspendUser(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email) as UserDocument;
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.status = 'suspended';
    await user.save();
    await this.systemLogsService.createLog(
      'Account Suspended',
      `User account suspended: ${user.email}`,
      LogSeverity.WARNING,
      user.employeeId?.toString(),
      undefined,
    );
    // Notify user of suspension
    await this.notificationService.sendRegistrationPin(user.phoneNumber, user.email, 'Your SRCC account has been suspended. Please contact support for more information.');
    return { message: `User ${user.email} has been suspended.` };
  }

  async activateUser(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email) as UserDocument;
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.status = 'active';
    await user.save();
    await this.systemLogsService.createLog(
      'Account Activated',
      `User account activated: ${user.email}`,
      LogSeverity.INFO,
      user.employeeId?.toString(),
      undefined,
    );
    // Notify user of activation
    await this.notificationService.sendRegistrationPin(user.phoneNumber, user.email, 'Your SRCC account has been reactivated. You may now log in.');
    return { message: `User ${user.email} has been reactivated.` };
  }

  private async generateToken(user: UserDocument): Promise<TokenPayload> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      expiresIn: 2 * 365 * 24 * 60 * 60,
    };
  }

  sanitizeUser(user: UserDocument): Partial<User> {
    const { password, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  }

  async getUserProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user as UserDocument);
  }
}
