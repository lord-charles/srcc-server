import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsArray,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class ContactPersonDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+254700000000' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid E.164 format (e.g., +254700000000)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateSupplierDto {
  @ApiProperty({ example: 'Tech Solutions Ltd' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'info@techsolutions.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+254700000000' })
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid E.164 format (e.g., +254700000000)',
  })
  phone: string;

  @ApiProperty({ example: 'P.O Box 12345, Nairobi' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiPropertyOptional({ type: ContactPersonDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactPersonDto)
  contactPerson?: ContactPersonDto;

  @ApiProperty({ example: 'A000000000X' })
  @IsNotEmpty()
  @IsString()
  kraPin: string;

  @ApiProperty({ example: 'CPR/2021/12345' })
  @IsNotEmpty()
  @IsString()
  registrationNumber: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  taxComplianceCertificateExpiry?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kraPinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incorporationCertificateUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otherComplianceDocumentUrl?: string;

  @ApiProperty({ example: 'Equity Bank' })
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty({ example: 'Westlands Branch' })
  @IsNotEmpty()
  @IsString()
  bankBranch: string;

  @ApiProperty({ example: 'Tech Solutions Ltd' })
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ enum: ['Goods', 'Services', 'Both'], default: 'Goods' })
  @IsNotEmpty()
  @IsEnum(['Goods', 'Services', 'Both'])
  supplierCategory: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicesProvided?: string[];

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended', 'pending_approval'])
  status?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}
