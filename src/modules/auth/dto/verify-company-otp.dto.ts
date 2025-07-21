import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class VerifyCompanyOtpDto {
  @ApiProperty({
    description: 'The business email of the organization',
    example: 'tech@companya.com',
  })
  @IsEmail()
  @IsNotEmpty()
  businessEmail: string;

  @ApiProperty({ description: 'The 6-digit PIN sent to the user' })
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({
    description: 'The type of verification to perform',
    enum: ['phone', 'email'],
  })
  @IsString()
  @IsIn(['phone', 'email'])
  verificationType: 'phone' | 'email';
}
