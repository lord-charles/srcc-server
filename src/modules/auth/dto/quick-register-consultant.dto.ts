import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class QuickRegisterConsultantDto {
  @ApiProperty({
    description: 'Employee email address',
    example: 'mwanikicharles226@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Phone number for contact and Mpesa transactions',
    example: '254740315545',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'National ID of the employee',
    example: '23456789',
  })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({
    description: 'Password for the account',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
