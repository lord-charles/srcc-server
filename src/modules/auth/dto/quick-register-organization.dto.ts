import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class QuickRegisterOrganizationDto {
  @ApiProperty({
    description: 'Business email of the organization',
    example: 'info@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  businessEmail: string;

  @ApiProperty({
    description: 'Business phone number in format 254XXXXXXXXX',
    example: '254712345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^254\d{9}$/, {
    message: 'Phone number must start with 254 followed by 9 digits',
  })
  businessPhone: string;

  @ApiProperty({
    description: 'Company registration number',
    example: 'CPT/2023/12345',
  })
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiProperty({
    description: 'KRA PIN number',
    example: 'A012345678B',
  })
  @IsString()
  @IsNotEmpty()
  kraPin: string;

  @ApiProperty({
    description: 'Password',
    example: 'Password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
