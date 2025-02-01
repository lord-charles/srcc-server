import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
  ) {}

  async register(
    createUserDto: CreateUserDto,
    req?: Request,
  ): Promise<AuthResponse> {
    try {
      // Check if user exists using the UserService's register method which already checks for duplicates
      const user = await this.userService.register(createUserDto);

      // Generate token
      const token = await this.generateToken(user as UserDocument);

      // Log successful registration
      await this.systemLogsService.createLog(
        'User Registration',
        `New user registered: ${user.firstName} ${user.lastName} (${user.email})`,
        LogSeverity.INFO,
        user.employeeId.toString(),
        req,
      );

      // Return user data (excluding sensitive information) and token
      return {
        user: this.sanitizeUser(user as UserDocument),
        token: token.token,
      };
    } catch (error) {
      // Log registration failure
      await this.systemLogsService.createLog(
        'Registration Failed',
        `Registration failed for email ${createUserDto.email}: ${error.message}`,
        LogSeverity.ERROR,
        undefined,
        req,
      );

      // Re-throw BadRequestException for duplicate users
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Handle other errors
      throw new Error(`Registration failed: ${error.message}`);
    }
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
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (user.status !== 'active') {
        await this.systemLogsService.createLog(
          'Inactive Account Login',
          `Login attempt on inactive account: ${user.email}`,
          LogSeverity.WARNING,
          user.employeeId?.toString(),
          req,
        );
        throw new UnauthorizedException('Account is not active');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        loginUserDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        await this.systemLogsService.createLog(
          'Login Failed',
          `Invalid password attempt for user: ${user.email}`,
          LogSeverity.WARNING,
          user.employeeId?.toString(),
          req,
        );
        throw new UnauthorizedException('Invalid credentials');
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

  /**
   * Get user profile by ID
   * @param userId User ID
   * @returns Sanitized user profile
   */
  async getUserProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user as UserDocument);
  }
}
