import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  Request as NestRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login.dto';
import { AuthResponse } from './interfaces/auth.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { User, UserDocument } from './schemas/user.schema';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend user account',
    description: `Suspend a user account by email. This endpoint is restricted to admin users only.\n\n- Requires a valid JWT token and admin role.\n- The email must belong to an existing user.\n- The user's status will be set to 'suspended'.\n- All suspension actions are logged for audit purposes.`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
          description: 'Email address of the user to suspend.',
        },
      },
    },
    description: 'Email address of the user to suspend.',
  })
  @ApiResponse({
    status: 200,
    description: 'User account suspended.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User user@example.com has been suspended.',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async suspendUser(@Body('email') email: string) {
    return this.authService.suspendUser(email);
  }

  @Post('/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate user account',
    description: `Reactivate a previously suspended user account by email. This endpoint is restricted to admin users only.\n\n- Requires a valid JWT token and admin role.\n- The email must belong to an existing user.\n- The user's status will be set to 'active'.\n- All activation actions are logged for audit purposes.`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
          description: 'Email address of the user to activate.',
        },
      },
    },
    description: 'Email address of the user to activate.',
  })
  @ApiResponse({
    status: 200,
    description: 'User account reactivated.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User user@example.com has been reactivated.',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async activateUser(@Body('email') email: string) {
    return this.authService.activateUser(email);
  }

  @Public()
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate employee',
    description: 'Login with email and password to receive access token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    schema: {
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
          },
        },
        token: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account',
  })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: ExpressRequest,
  ): Promise<AuthResponse> {
    return this.authService.login(loginUserDto, req);
  }

  @Public()
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'If your email is registered, you will receive password reset instructions.',
    schema: { properties: { message: { type: 'string' } } },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or error processing request.',
  })
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
    @Req() req: ExpressRequest,
  ): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(requestPasswordResetDto, req);
  }

  @Public()
  @Post('confirm-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm password reset with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password has been successfully reset.',
    schema: { properties: { message: { type: 'string' } } },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired token, or error processing request.',
  })
  async confirmPasswordReset(
    @Body() confirmPasswordResetDto: ConfirmPasswordResetDto,
    @Req() req: ExpressRequest,
  ): Promise<{ message: string }> {
    return this.authService.confirmPasswordReset(confirmPasswordResetDto, req);
  }

  @Get('/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authenticated user profile',
    description: 'Returns the profile of the currently authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phoneNumber: { type: 'string' },
        employeeId: { type: 'string' },
        department: { type: 'string' },
        position: { type: 'string' },
        roles: { type: 'array', items: { type: 'string' } },
        status: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async getProfile(
    @NestRequest() req: ExpressRequest & { user: User | UserDocument },
  ) {
    if (!('toObject' in req.user)) {
      throw new Error('Invalid user document type');
    }
    return this.authService.sanitizeUser(req.user);
  }
}
