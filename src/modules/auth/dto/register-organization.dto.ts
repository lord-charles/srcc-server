import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

class ContactPersonDto {
  @ApiProperty({ description: 'Name of contact person' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Position in the organization' })
  @IsString()
  position: string;

  @ApiProperty({ description: 'Contact email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  phoneNumber: string;
}

class BankDetailsDto {
  @ApiProperty({ description: 'Name of the bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Bank account number' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Branch code of the bank' })
  @IsString()
  branchCode: string;
}

export class RegisterOrganizationDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Company registration number' })
  @IsString()
  registrationNumber: string;

  @ApiProperty({ description: 'KRA PIN number' })
  @IsString()
  kraPin: string;

  @ApiProperty({ description: 'Physical business address' })
  @IsString()
  businessAddress: string;

  @ApiProperty({ description: 'Postal business address' })
  @IsString()
  @IsOptional()
  postalAddress?: string;

  @ApiProperty({ description: 'County of operation' })
  @IsString()
  county: string;

  @ApiProperty({ description: 'Business phone number' })
  @IsString()
  businessPhone: string;

  @ApiProperty({ description: 'Business email' })
  @IsEmail()
  businessEmail: string;

  @ApiProperty({ description: 'Company website' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Primary expertise/department' })
  @IsString()
  department: string;

  @ApiProperty({ description: 'Years of operation' })
  @IsNumber()
  @Min(0)
  yearsOfOperation: number;

  @ApiProperty({ description: 'Hourly rate in KES' })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiProperty({
    description: 'Services offered by the organization',
    example: ['Software Development', 'IT Consulting', 'Cloud Solutions']
  })
  @IsArray()
  @IsString({ each: true })
  servicesOffered: string[];

  @ApiProperty({
    description: 'Industries the organization operates in',
    example: ['Technology', 'Finance', 'Healthcare']
  })
  @IsArray()
  @IsString({ each: true })
  industries: string[];

  @ApiProperty({ description: 'Preferred work types' })
  @IsArray()
  @IsString({ each: true })
  preferredWorkTypes: string[];

  @ApiProperty({ description: 'Contact person details' })
  @ValidateNested()
  @Type(() => ContactPersonDto)
  contactPerson: ContactPersonDto;

  @ApiProperty({ description: 'Bank payment details' })
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails: BankDetailsDto;

  @ApiProperty({
    description: 'Tax compliance certificate expiry date',
    example: '2025-12-31',
    type: String
  })
  @IsString()
  taxComplianceExpiryDate: string;
}
