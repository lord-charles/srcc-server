import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  IsUrl,
  Length,
  Min,
  Max,
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// Skill DTO
export class SkillDto {
  @ApiProperty({
    description: 'Name of the skill',
    example: 'Project Management',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: 'Years of experience with this skill',
    example: 5,
    minimum: 0,
    maximum: 50,
  })
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience: number;

  @ApiProperty({
    description: 'Proficiency level',
    example: 'Expert',
    enum: ['Beginner', 'Intermediate', 'Expert'],
  })
  @IsEnum(['Beginner', 'Intermediate', 'Expert'])
  proficiencyLevel: string;
}

// Education DTO
export class EducationDto {
  @ApiProperty({
    description: 'Name of institution',
    example: 'University of Nairobi',
  })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({
    description: 'Qualification obtained',
    example: 'Bachelor of Science in Computer Science',
  })
  @IsString()
  @IsNotEmpty()
  qualification: string;

  @ApiProperty({
    description: 'Year of completion',
    example: '2020',
  })
  @IsString()
  yearOfCompletion: string;
}

// Certification DTO
export class CertificationDto {
  @ApiProperty({
    description: 'Name of certification',
    example: 'PMP',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Issuing organization',
    example: 'PMI',
  })
  @IsString()
  @IsNotEmpty()
  issuingOrganization: string;

  @ApiProperty({
    description: 'Date of issuance',
    example: '2020-01-15',
  })
  @IsDate()
  @Type(() => Date)
  dateIssued: Date;

  @ApiPropertyOptional({
    description: 'Expiry date if applicable',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  @ApiPropertyOptional({
    description: 'Certification ID or number',
    example: 'PMP123456',
  })
  @IsOptional()
  @IsString()
  certificationId?: string;
}

// Academic Certificate DTO
export class AcademicCertificateDto {
  @ApiProperty({
    description: 'Name of the certificate',
    example: 'Bachelor of Science',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Institution that issued the certificate',
    example: 'University of Nairobi',
  })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({
    description: 'Year of completion',
    example: '2020',
  })
  @IsString()
  yearOfCompletion: string;

  @ApiProperty({
    description: 'URL to the certificate document',
    example: 'https://cloudinary.com/certificates/bsc.pdf',
  })
  @IsUrl()
  documentUrl: string;
}

// Bank Details DTO
export class BankDetailsDto {
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

// Mpesa Details DTO
export class MpesaDetailsDto {
  @ApiPropertyOptional({
    description: 'Phone number linked to Mpesa',
    example: '+254712345678',
  })
  @IsOptional()
  phoneNumber?: string;
}

// Emergency Contact DTO
export class EmergencyContactDto {
  @ApiProperty({
    description: 'Name of the contact',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Relationship to the employee',
    example: 'Spouse',
  })
  @IsString()
  @IsNotEmpty()
  relationship: string;

  @ApiProperty({
    description: 'Primary phone number',
    example: '+254712345678',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Alternative phone number',
    example: '+254723456789',
  })
  @IsOptional()
  alternativePhoneNumber?: string;
}

// Main User DTO
export class UserDto {
  @ApiPropertyOptional({
    description: 'Employee first name',
    example: 'Jane',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Employee last name',
    example: 'Wanjiku',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Employee middle name',
    example: 'Njeri',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  middleName?: string;

  @ApiProperty({
    description: 'Employee email address',
    example: 'jane.wanjiku@company.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Phone number for contact and Mpesa transactions',
    example: '+254712345678',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Alternative phone number',
    example: '+254723456789',
  })
  @IsOptional()
  alternativePhoneNumber?: string;

  @ApiProperty({
    description: 'National ID of the employee',
    example: '23456789',
  })
  @IsString()
  nationalId: string;

  @ApiPropertyOptional({
    description: 'KRA PIN number',
    example: 'A012345678B',
  })
  @IsOptional()
  @IsString()
  kraPinNumber?: string;

  @ApiPropertyOptional({
    description: 'NHIF number',
    example: 'NHIF123456',
  })
  @IsOptional()
  @IsString()
  nhifNumber?: string;

  @ApiPropertyOptional({
    description: 'NSSF number',
    example: 'NSSF123456',
  })
  @IsOptional()
  @IsString()
  nssfNumber?: string;

  @ApiPropertyOptional({
    description: 'Status of the consultant account',
    example: 'pending',
    enum: ['pending', 'active', 'inactive', 'suspended', 'terminated'],
  })
  @IsOptional()
  @IsEnum(['pending', 'active', 'inactive', 'suspended', 'terminated'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Employee date of birth',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: 'Westlands, Nairobi',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  physicalAddress?: string;

  @ApiPropertyOptional({
    description: 'Postal address',
    example: 'P.O. Box 12345-00100',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  postalAddress?: string;

  @ApiPropertyOptional({
    description: 'County of residence',
    example: 'Nairobi',
  })
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional({
    description: 'Consultant skills and expertise',
    type: [SkillDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiPropertyOptional({
    description: 'Educational background',
    type: [EducationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({
    description: 'Professional certifications',
    type: [CertificationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiPropertyOptional({
    description: 'CV/Resume URL',
    example: 'https://cloudinary.com/cv/john-doe-cv.pdf',
  })
  @IsOptional()
  @IsUrl()
  cvUrl?: string;

  @ApiPropertyOptional({
    description: 'Academic certificates',
    type: [AcademicCertificateDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcademicCertificateDto)
  academicCertificates?: AcademicCertificateDto[];

  @ApiPropertyOptional({
    description: 'Years of total work experience',
    example: 8,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Consultant hourly rate in KES',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Availability status',
    example: 'available',
    enum: ['available', 'partially_available', 'not_available'],
  })
  @IsOptional()
  @IsEnum(['available', 'partially_available', 'not_available'])
  availability?: string;

  @ApiPropertyOptional({
    description: 'Preferred work type',
    example: ['remote', 'hybrid'],
    enum: ['remote', 'onsite', 'hybrid'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['remote', 'onsite', 'hybrid'], { each: true })
  preferredWorkTypes?: string[];

  @ApiPropertyOptional({
    description: 'Roles assigned in the app',
    example: ['consultant'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Job position or title',
    example: 'Senior Consultant',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  position?: string;

  @ApiPropertyOptional({
    description: 'Primary expertise/department',
    example: 'Software Engineering',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  department?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact details',
    type: EmergencyContactDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @ApiPropertyOptional({
    description: 'Bank payment details',
    type: BankDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;

  @ApiPropertyOptional({
    description: 'Mpesa payment details',
    type: MpesaDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MpesaDetailsDto)
  mpesaDetails?: MpesaDetailsDto;

  @ApiPropertyOptional({
    description: 'Registration status',
    example: 'quick',
    enum: ['quick', 'complete'],
  })
  @IsOptional()
  @IsEnum(['quick', 'complete'])
  registrationStatus?: string;
}

// Response DTOs for Swagger documentation
export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  _id: string;

  @ApiProperty({ description: 'Employee first name', required: false })
  firstName?: string;

  @ApiProperty({ description: 'Employee last name', required: false })
  lastName?: string;

  @ApiProperty({ description: 'Employee middle name', required: false })
  middleName?: string;

  @ApiProperty({ description: 'Employee email address' })
  email: string;

  @ApiProperty({ description: 'Phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Alternative phone number', required: false })
  alternativePhoneNumber?: string;

  @ApiProperty({ description: 'National ID' })
  nationalId: string;

  @ApiProperty({ description: 'Employee ID', required: false })
  employeeId?: string;

  @ApiProperty({ description: 'Account status' })
  status: string;

  @ApiProperty({ description: 'Registration status' })
  registrationStatus: string;

  @ApiProperty({ description: 'Availability status' })
  availability: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error type/name' })
  error: string;

  @ApiProperty({ description: 'Request timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request path' })
  path: string;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Detailed validation error messages',
    type: [String],
  })
  errorMessage: string[];
}
