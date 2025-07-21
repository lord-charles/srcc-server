import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsEmail,
  IsUrl,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Organization } from '../schemas/organization.schema';

// Contact Person Update DTO
export class UpdateContactPersonDto {
  @ApiPropertyOptional({
    description: 'Name of contact person',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Position in the organization',
    example: 'HR Manager',
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'john.doe@company.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '0712345678',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

// Bank Details Update DTO
export class UpdateBankDetailsDto {
  @ApiPropertyOptional({
    description: 'Name of the bank',
    example: 'Equity Bank',
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'Branch code of the bank',
    example: '123',
  })
  @IsOptional()
  @IsString()
  branchCode?: string;
}

// Main Organization Update DTO
export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Tech Solutions Ltd',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Company registration number',
    example: 'PVT-1234567X',
  })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'KRA PIN number',
    example: 'P051234567Q',
  })
  @IsOptional()
  @IsString()
  kraPin?: string;

  @ApiPropertyOptional({
    description: 'Physical business address',
    example: 'Westlands Business Park, Block A',
  })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Postal business address',
    example: 'P.O. Box 12345-00100',
  })
  @IsOptional()
  @IsString()
  postalAddress?: string;

  @ApiPropertyOptional({
    description: 'County of operation',
    example: 'Nairobi',
  })
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional({
    description: 'Business phone number',
    example: '0712345678',
  })
  @IsOptional()
  @IsString()
  businessPhone?: string;

  @ApiPropertyOptional({
    description: 'Business email',
    example: 'info@techsolutions.co.ke',
  })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({
    description: 'Company website',
    example: 'https://techsolutions.co.ke',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Primary expertise/department',
    example: 'Software Development',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Years of operation', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfOperation?: number;

  @ApiPropertyOptional({ description: 'Hourly rate in KES', example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Services offered by the organization',
    example: ['Software Development', 'IT Consulting', 'Cloud Solutions'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicesOffered?: string[];

  @ApiPropertyOptional({
    description: 'Industries the organization operates in',
    example: ['Technology', 'Finance', 'Healthcare'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({
    description: 'Preferred work type',
    example: ['remote', 'hybrid'],
    enum: ['remote', 'onsite', 'hybrid'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['remote', 'onsite', 'hybrid'], { each: true })
  preferredWorkTypes?: string[];

  @ApiPropertyOptional({ description: 'Contact person details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContactPersonDto)
  contactPerson?: UpdateContactPersonDto;

  @ApiPropertyOptional({ description: 'Bank payment details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBankDetailsDto)
  bankDetails?: UpdateBankDetailsDto;

  @ApiPropertyOptional({
    description: 'Certificate of registration document URL',
  })
  @IsOptional()
  @IsUrl()
  registrationCertificateUrl?: string;

  @ApiPropertyOptional({ description: 'KRA certificate document URL' })
  @IsOptional()
  @IsUrl()
  kraCertificateUrl?: string;

  @ApiPropertyOptional({ description: 'Tax compliance certificate URL' })
  @IsOptional()
  @IsUrl()
  taxComplianceCertificateUrl?: string;

  @ApiPropertyOptional({ description: 'CR12 document URL' })
  @IsOptional()
  @IsUrl()
  cr12Url?: string;

  @ApiPropertyOptional({
    description: 'Tax compliance certificate expiry date',
  })
  @IsOptional()
  @IsDateString()
  taxComplianceExpiryDate?: string;
}

// Response DTOs for Swagger documentation
export class UpdateOrganizationResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code', example: 200 })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Organization updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated organization data',
    type: () => Organization,
  })
  data: Organization;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  timestamp: string;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Success status', example: false })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode: number;

  @ApiProperty({ description: 'Error message', example: 'Validation failed' })
  message: string;

  @ApiProperty({
    description: 'Detailed error information',
    example: ['Company name is required'],
    required: false,
  })
  errors?: string[];

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  timestamp: string;
}
