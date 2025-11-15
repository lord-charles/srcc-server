import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDate,
  IsNumber,
  MinLength,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsPositive,
  IsDateString,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class BankDetailsDto {
  @ApiProperty({
    description: 'Name of the bank',
    example: 'Equity Bank',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    description: 'Branch code of the bank',
    example: '123',
    required: false,
  })
  @IsOptional()
  @IsString()
  branchCode?: string;
}


class EmergencyContactDto {
  @ApiProperty({
    description: 'Name of the emergency contact',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Relationship to the employee',
    example: 'Spouse',
  })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiProperty({
    description: 'Primary phone number',
    example: '254712345678',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Alternative phone number (if any)',
    example: '254723456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  alternativePhoneNumber?: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'Employee first name', example: 'Jane' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Status of the employee account',
    example: 'active',
    enum: ['active', 'inactive', 'suspended', 'terminated'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended', 'terminated'])
  status?: string;

  @ApiProperty({ description: 'Employee last name', example: 'Wanjiku' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Email address of the employee',
    example: 'jane.wanjiku@company.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Phone number for Mpesa transactions',
    example: '254712345678',
  })
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
    description: 'Roles assigned in the app',
    example: ['employee'],
  })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiProperty({
    description: 'Employee ID or staff number',
    example: 'EMP2024001',
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({
    description: 'Date of birth of the employee',
    example: '',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'Department the employee belongs to',
    example: 'Engineering',
  })
  @IsOptional()
  @IsString()
  department: string;

  @ApiProperty({
    description: 'NHIF deduction in KES (optional)',
    example: 1700,
    required: false,
  })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  nhifDeduction?: number;

  @ApiProperty({
    description: 'NSSF deduction in KES (optional)',
    example: 200,
    required: false,
  })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  nssfDeduction?: number;

  @ApiProperty({
    description: 'Bank payment details (if applicable)',
    type: BankDetailsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;


  @ApiProperty({
    description: 'Emergency contact details',
    type: EmergencyContactDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @ApiProperty({
    description: 'User module permissions',
    example: {
      '/projects': ['read', 'write'],
      '/my-projects': ['read', 'write'],
      '/budget': ['read'],
    },
    required: false,
  })
  @IsOptional()
  permissions?: Record<string, string[]>;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
