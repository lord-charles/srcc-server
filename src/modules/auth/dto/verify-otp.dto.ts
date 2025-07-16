import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'jane.wanjiku@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The 4-digit verification PIN',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({
    description: 'The type of verification to perform',
    example: 'phone',
    enum: ['phone', 'email'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['phone', 'email'])
  verificationType: 'phone' | 'email';
}
