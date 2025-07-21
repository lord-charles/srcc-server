import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { LoginType } from '../types/auth.types';

export class LoginOrganizationDto {
  @ApiProperty({
    description: 'Organization business email',
    example: 'mwanikicharles226@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Login type',
    example: 'organization',
  })
  @IsString()
  @IsNotEmpty()
  type: LoginType;
}
