import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsMongoId,
} from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: 'Employee email address',
    example: 'jane.wanjiku@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class EmailDto {
  @ApiProperty({
    description: 'Employee email address',
    example: 'jane.wanjiku@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Reset token received via email',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Account password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Account password',  
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New account password',
    example: 'securePassword456',
  })
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @ApiProperty({
    description: 'Employee ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
