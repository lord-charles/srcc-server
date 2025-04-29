import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address associated with the account' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Email address associated with the account' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '4-digit reset PIN sent to email/SMS' })
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  pin: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
