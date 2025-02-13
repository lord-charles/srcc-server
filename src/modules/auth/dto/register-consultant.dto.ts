import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsNumber, IsDate, ValidateNested, IsOptional, Min, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class SkillDto {
  @ApiProperty({ description: 'Name of the skill', example: 'Project Management' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Years of experience with this skill', example: 5 })
  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @ApiProperty({
    description: 'Proficiency level',
    example: 'Expert',
    enum: ['Beginner', 'Intermediate', 'Expert']
  })
  @IsEnum(['Beginner', 'Intermediate', 'Expert'])
  proficiencyLevel: string;
}

class EducationDto {
  @ApiProperty({ description: 'Name of institution', example: 'University of Nairobi' })
  @IsString()
  institution: string;

  @ApiProperty({ description: 'Qualification obtained', example: 'Bachelor of Science in Computer Science' })
  @IsString()
  qualification: string;

  @ApiProperty({ description: 'Year of completion', example: '2020' })
  @IsString()
  yearOfCompletion: string;
}

class AcademicCertificateDto {
  @ApiProperty({ description: 'Name of the certificate', example: 'Bachelor of Science' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Institution that issued the certificate', example: 'University of Nairobi' })
  @IsString()
  institution: string;

  @ApiProperty({ description: 'Year of completion', example: '2020' })
  @IsString()
  yearOfCompletion: string;
}

class CertificationDto {
  @ApiProperty({ description: 'Name of certification', example: 'PMP' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Issuing organization', example: 'PMI' })
  @IsString()
  issuingOrganization: string;

  @ApiProperty({ description: 'Date of issuance' })
  @IsString()
  dateIssued: string;

  @ApiProperty({ description: 'Expiry date if applicable' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({ description: 'Certification ID or number', example: 'PMP123456' })
  @IsOptional()
  @IsString()
  certificationId?: string;
}

class EmergencyContactDto {
  @ApiProperty({ description: 'Name of the contact', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Relationship to the consultant', example: 'Spouse' })
  @IsString()
  relationship: string;

  @ApiProperty({ description: 'Primary phone number', example: '+254712345678' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'Alternative phone number', example: '+254723456789' })
  @IsOptional()
  @IsString()
  alternativePhoneNumber?: string;
}

class BankDetailsDto {
  @ApiProperty({ description: 'Name of the bank', example: 'Equity Bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Bank account number', example: '1234567890' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Branch code of the bank', example: '123' })
  @IsString()
  branchCode: string;
}

class MpesaDetailsDto {
  @ApiProperty({ description: 'Phone number linked to Mpesa', example: '+254712345678' })
  @IsString()
  phoneNumber: string;
}

export class RegisterConsultantDto {
  @ApiProperty({ description: 'First name', example: 'Jane' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Wanjiku' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Middle name', example: 'Njeri' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ description: 'Email address', example: 'jane.wanjiku@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Phone number', example: '+254712345678' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'Alternative phone number', example: '+254723456789' })
  @IsOptional()
  @IsString()
  alternativePhoneNumber?: string;

  @ApiProperty({ description: 'National ID number', example: '23456789' })
  @IsString()
  nationalId: string;

  @ApiProperty({ description: 'KRA PIN number', example: 'A012345678B' })
  @IsString()
  kraPinNumber: string;

  @ApiProperty({ description: 'Date of birth', example: '1990-01-15' })
  @IsString()
  dateOfBirth: string;

  @ApiProperty({ description: 'Physical address', example: 'Westlands, Nairobi' })
  @IsString()
  physicalAddress: string;

  @ApiProperty({ description: 'Postal address', example: 'P.O. Box 12345-00100' })
  @IsOptional()
  @IsString()
  postalAddress?: string;

  @ApiProperty({ description: 'County of residence', example: 'Nairobi' })
  @IsString()
  county: string;

  @ApiProperty({ description: 'NSSF number', example: 'NSSF123456' })
  @IsString()
  nssfNumber: string;

  @ApiProperty({ description: 'NHIF number', example: 'NHIF123456' })
  @IsString()
  nhifNumber: string;

  @ApiProperty({ description: 'NSSF deduction amount', example: 200 })
  @IsNumber()
  nssfDeduction: number;

  @ApiProperty({ description: 'NHIF deduction amount', example: 500 })
  @IsNumber()
  nhifDeduction: number;

  @ApiProperty({ description: 'Skills array', type: [SkillDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills: SkillDto[];

  @ApiProperty({ description: 'Education background', type: [EducationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education: EducationDto[];

  @ApiProperty({ description: 'Academic certificates', type: [AcademicCertificateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcademicCertificateDto)
  academicCertificates: AcademicCertificateDto[];

  @ApiProperty({ description: 'Professional certifications', type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiProperty({ description: 'Years of total work experience', example: 8 })
  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @ApiProperty({ description: 'Consultant hourly rate in KES', example: 5000 })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiProperty({
    description: 'Preferred work types',
    example: ['remote', 'hybrid'],
    enum: ['remote', 'onsite', 'hybrid'],
    isArray: true
  })
  @IsArray()
  @IsEnum(['remote', 'onsite', 'hybrid'], { each: true })
  preferredWorkTypes: string[];

  @ApiProperty({ description: 'Primary expertise/department', example: 'Software Engineering' })
  @IsString()
  department: string;

  @ApiProperty({ description: 'Emergency contact details' })
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact: EmergencyContactDto;

  @ApiProperty({ description: 'Bank details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;

  @ApiProperty({ description: 'Mpesa details for payments' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MpesaDetailsDto)
  mpesaDetails?: MpesaDetailsDto;
}
