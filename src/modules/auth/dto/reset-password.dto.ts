import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

import { LoginType } from '../types/auth.types';

export class RequestPasswordResetDto {
  @ApiProperty({
    description:
      'Email address of the user or organization requesting password reset',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Login type',
    example: 'user',
  })
  @IsNotEmpty({ message: 'Type is required' })
  @IsString({ message: 'Type must be a string' })
  type: LoginType;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({
    description:
      'Email address of the user or organization confirming password reset',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({
    description: 'The password reset PIN sent to the user or organization',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Reset token is required' })
  @IsString({ message: 'Reset token must be a string' })
  resetToken: string;

  @ApiProperty({
    description: 'The new password for the user or organization account',
    example: 'NewStrongPassword123!',
  })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'New password must be a string' })
  newPassword: string;

  @ApiProperty({
    description: 'Login type',
    example: 'user',
  })
  @IsNotEmpty({ message: 'Type is required' })
  @IsString({ message: 'Type must be a string' })
  type: LoginType;
}
