import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class CompanyContactDetailsDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'company@example.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '+254123456789' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Company Address' })
  address: string;
}

export class ContactPersonDetailsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Manager' })
  position: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '+254123456789' })
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'john@example.com' })
  email: string;
}

export class CreateContractorDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'ABC Construction Ltd' })
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'REG123456' })
  registrationNumber: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 2020 })
  registrationYear: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'A123456789B' })
  kraPinNumber: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  @ValidateNested()
  @Type(() => CompanyContactDetailsDto)
  @ApiProperty({
    type: CompanyContactDetailsDto,
    example: {
      email: 'company@example.com',
      phone: '+254123456789',
      address: 'Company Address'
    }
  })
  companyContactDetails: CompanyContactDetailsDto;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  @ValidateNested()
  @Type(() => ContactPersonDetailsDto)
  @ApiProperty({
    type: ContactPersonDetailsDto,
    example: {
      name: 'John Doe',
      position: 'Manager',
      phone: '+254123456789',
      email: 'john@example.com'
    }
  })
  contactPersonDetails: ContactPersonDetailsDto;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'TCC123456' })
  tccNumber: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  certificateOfIncorporation?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  cr12Document?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  kraPinCertificate?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  tccCertificate?: string;
}
