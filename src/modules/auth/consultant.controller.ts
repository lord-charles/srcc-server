import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Patch,
  Param,
  UseGuards,
  Get,
  Req,
  Query,
  HttpStatus,
  HttpException,
  HttpCode,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { RegisterConsultantDto } from './dto/register-consultant.dto';
import { QuickRegisterConsultantDto } from './dto/quick-register-consultant.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ConsultantService } from './consultant.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { VerifyCompanyOtpDto } from './dto/verify-company-otp.dto';
import { QuickRegisterOrganizationDto } from './dto/quick-register-organization.dto';
import { Organization } from './schemas/organization.schema';
import { Request as ExpressRequest } from 'express';
import {
  ErrorResponseDto,
  UpdateOrganizationDto,
  UpdateOrganizationResponseDto,
} from './dto/update-organization.dto';
import { OrganizationService } from './organization.service';
import {
  UserDto,
  UserResponseDto,
  ValidationErrorResponseDto,
} from './dto/update-consultant.dto';
import { UserService } from './user.service';

@ApiTags('consultants')
@ApiBearerAuth()
@Controller('consultants')
export class ConsultantController {
  constructor(
    private readonly consultantService: ConsultantService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @Post('quick-register')
  @ApiOperation({
    summary: 'Quick register a new consultant',
    description: `Register a new consultant with minimal details: email, phone number, national ID, and password. 
    This will create a user with a 'quick' registration status. The user will need to complete their profile later using the full registration endpoint. 
    Verification PINs will be sent to the provided email and phone number.`,
  })
  @ApiResponse({
    status: 201,
    description:
      'Consultant quick-registered successfully. Verification PINs sent.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - User with the same email, phone number, or national ID already exists.',
  })
  async quickRegister(@Body() quickRegisterDto: QuickRegisterConsultantDto) {
    try {
      return this.consultantService.quickRegister(quickRegisterDto);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process quick registration: ${error.message}`,
      );
    }
  }

  @Public()
  @Post('quick-company-register')
  @ApiOperation({
    summary: 'Quick register a new organization',
    description: `Register a new organization with minimal details: business email, business phone, registration number, and password. 
    This will create an organization with a 'quick' registration status. The organization will need to complete their profile later using the full registration endpoint. 
    Verification PINs will be sent to the provided email and phone number.`,
  })
  @ApiResponse({
    status: 201,
    description:
      'Organization quick-registered successfully. Verification PINs sent.',
    type: Organization,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - Organization with the same email, phone number, or registration number already exists.',
  })
  @ApiBody({ type: QuickRegisterOrganizationDto })
  async quickCompanyRegister(
    @Body() quickCompanyRegisterDto: QuickRegisterOrganizationDto,
  ): Promise<Organization> {
    try {
      return this.consultantService.quickCompanyRegister(
        quickCompanyRegisterDto,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process quick registration: ${error.message}`,
      );
    }
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP for phone or email',
    description: `Verifies the OTP sent to the user's phone or email during quick registration. If both are verified, the user's status will be updated to 'pending' and will be ready for admin approval upon profile completion.`,
  })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      const user = await this.consultantService.verifyOtp(verifyOtpDto);
      return {
        message: `${verifyOtpDto.verificationType} verified successfully.`,
        user,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to verify OTP: ${error.message}`);
    }
  }

  @Public()
  @Get('verification-status')
  @ApiOperation({
    summary: 'Get user verification status',
    description: `Retrieves the email and phone verification status for a user based on their email address.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        isEmailVerified: { type: 'boolean' },
        isPhoneVerified: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getVerificationStatus(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }
    try {
      return this.consultantService.getVerificationStatus(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get verification status: ${error.message}`,
      );
    }
  }

  @Public()
  @Post('company/verify-otp')
  @ApiOperation({
    summary: 'Verify OTP for company phone or email',
    description: `Verifies the OTP sent to the company's phone or email during quick registration. If both are verified, the company's status will be updated to 'pending' and will be ready for admin approval upon profile completion.`,
  })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async verifyCompanyOtp(@Body() verifyOtpDto: VerifyCompanyOtpDto) {
    try {
      const org = await this.consultantService.verifyCompanyOtp(verifyOtpDto);
      return {
        message: `${verifyOtpDto.verificationType} verified successfully.`,
        organization: org,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        console.log(error.message);
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(`Failed to verify OTP: ${error.message}`);
      console.log(error.message);
    }
  }

  @Public()
  @Get('company/verification-status')
  @ApiOperation({
    summary: 'Get company verification status',
    description: `Retrieves the email and phone verification status for an organization based on its business email address.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        isEmailVerified: { type: 'boolean' },
        isPhoneVerified: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getCompanyVerificationStatus(
    @Query('businessEmail') businessEmail: string,
  ) {
    if (!businessEmail) {
      throw new BadRequestException(
        'Business email query parameter is required',
      );
    }
    try {
      return this.consultantService.getCompanyVerificationStatus(businessEmail);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get verification status: ${error.message}`,
      );
    }
  }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new consultant',
    description: `Register a new consultant with all required details and documents.
    
    Required documents:
    - CV/Resume (PDF or DOCX format)
    - Academic Certificates (PDF or DOCX format, max 5)
    
    Note: 
    - All documents must be in PDF or DOCX format
    - The consultant's status will be set to 'pending' until approved by an admin`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Jane' },
        lastName: { type: 'string', example: 'Wanjiku' },
        middleName: { type: 'string', example: 'Njeri' },
        email: { type: 'string', example: 'jane.wanjiku@example.com' },
        phoneNumber: { type: 'string', example: '+254712345678' },
        alternativePhoneNumber: { type: 'string', example: '+254723456789' },
        nationalId: { type: 'string', example: '23456789' },
        kraPinNumber: { type: 'string', example: 'A012345678B' },
        dateOfBirth: { type: 'string', format: 'date', example: '1990-01-15' },
        physicalAddress: { type: 'string', example: 'Westlands, Nairobi' },
        postalAddress: { type: 'string', example: 'P.O. Box 12345-00100' },
        county: { type: 'string', example: 'Nairobi' },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Project Management' },
              yearsOfExperience: { type: 'number', example: 5 },
              proficiencyLevel: {
                type: 'string',
                enum: ['Beginner', 'Intermediate', 'Expert'],
                example: 'Expert',
              },
            },
          },
        },
        education: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              institution: { type: 'string', example: 'University of Nairobi' },
              qualification: {
                type: 'string',
                example: 'Bachelor of Science in Computer Science',
              },
              yearOfCompletion: { type: 'string', example: '2020' },
            },
          },
        },
        academicCertificates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Bachelor of Science' },
              institution: { type: 'string', example: 'University of Nairobi' },
              yearOfCompletion: { type: 'string', example: '2020' },
            },
          },
        },
        certifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'PMP' },
              issuingOrganization: { type: 'string', example: 'PMI' },
              dateIssued: {
                type: 'string',
                format: 'date',
                example: '2023-01-15',
              },
              expiryDate: {
                type: 'string',
                format: 'date',
                example: '2026-01-15',
              },
              certificationId: { type: 'string', example: 'PMP123456' },
            },
          },
        },
        yearsOfExperience: { type: 'number', example: 8 },
        hourlyRate: { type: 'number', example: 5000 },
        preferredWorkTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['remote', 'onsite', 'hybrid'],
          },
          example: ['remote', 'hybrid'],
        },
        department: { type: 'string', example: 'Software Engineering' },
        emergencyContact: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe' },
            relationship: { type: 'string', example: 'Spouse' },
            phoneNumber: { type: 'string', example: '+254712345678' },
            alternativePhoneNumber: {
              type: 'string',
              example: '+254723456789',
            },
          },
        },
        bankDetails: {
          type: 'object',
          properties: {
            bankName: { type: 'string', example: 'Equity Bank' },
            accountNumber: { type: 'string', example: '1234567890' },
            branchCode: { type: 'string', example: '123' },
          },
        },
        mpesaDetails: {
          type: 'object',
          properties: {
            phoneNumber: { type: 'string', example: '+254712345678' },
          },
        },
        nssfNumber: { type: 'string', example: '1234567890' },
        nhifNumber: { type: 'string', example: '1234567890' },
        nssfDeduction: { type: 'number', example: 1000 },
        nhifDeduction: { type: 'number', example: 500 },
        cv: { type: 'string', format: 'binary' },
        academicCertificateFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: [
        'nationalId',
        'kraPinNumber',
        'dateOfBirth',
        'physicalAddress',
        'county',
        'skills',
        'education',
        'academicCertificates',
        'yearsOfExperience',
        'hourlyRate',
        'preferredWorkTypes',
        'department',
        'emergencyContact',
        'preferredPaymentMethod',
        'nssfNumber',
        'nhifNumber',
        'nssfDeduction',
        'nhifDeduction',
        'cv',
        'academicCertificateFiles',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Consultant registered successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or missing required fields/documents.',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 },
        { name: 'academicCertificateFiles', maxCount: 5 },
      ],
      {
        fileFilter: (req, file, callback) => {
          callback(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB limit
        },
      },
    ),
  )
  async register(
    @Body() registerConsultantDto: RegisterConsultantDto,
    @Req() req: ExpressRequest,
    @UploadedFiles()
    files: {
      cv?: Express.Multer.File[];
      academicCertificateFiles?: Express.Multer.File[];
    },
  ) {
    try {
      // Validate required files
      if (!files.cv?.[0]) {
        throw new BadRequestException('CV/Resume is required');
      }
      if (!files.academicCertificateFiles?.length) {
        throw new BadRequestException(
          'At least one academic certificate is required',
        );
      }
      if (files.academicCertificateFiles.length > 5) {
        throw new BadRequestException(
          'Maximum 5 academic certificates are allowed',
        );
      }

      // Validate file sizes
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (files.cv[0].size > maxSize) {
        throw new BadRequestException('CV file size should not exceed 5MB');
      }
      for (const file of files.academicCertificateFiles) {
        if (file.size > maxSize) {
          throw new BadRequestException(
            'Academic certificate file size should not exceed 5MB',
          );
        }
      }

      // Upload CV
      const cvResult = await this.cloudinaryService.uploadFile(
        files.cv[0],
        'consultant-cvs',
      );

      // Upload and process academic certificates
      const academicCertificates = await Promise.all(
        files.academicCertificateFiles.map(async (file, index) => {
          const result = await this.cloudinaryService.uploadFile(
            file,
            'consultant-academic-certs',
          );
          const certDetails = registerConsultantDto.academicCertificates[index];
          return {
            name: certDetails.name,
            institution: certDetails.institution,
            yearOfCompletion: certDetails.yearOfCompletion,
            documentUrl: result.secure_url,
          };
        }),
      );

      // Parse data with error handling
      const parsedData = {
        ...registerConsultantDto,
        dateOfBirth: new Date(registerConsultantDto.dateOfBirth),
        // Parse skills array - handle both string array and direct array
        skills: Array.isArray(registerConsultantDto.skills)
          ? registerConsultantDto.skills.map((skill) =>
              typeof skill === 'string' ? JSON.parse(skill)[0] : skill,
            )
          : JSON.parse(registerConsultantDto.skills),
        // Parse education array - handle both string array and direct array
        education: Array.isArray(registerConsultantDto.education)
          ? registerConsultantDto.education.map((edu) =>
              typeof edu === 'string' ? JSON.parse(edu)[0] : edu,
            )
          : JSON.parse(registerConsultantDto.education),
        // Parse certifications and their dates - handle both string array and direct array
        certifications:
          typeof registerConsultantDto.certifications === 'string'
            ? JSON.parse(registerConsultantDto.certifications).map((cert) => ({
                ...cert,
                dateIssued: cert.dateIssued
                  ? new Date(cert.dateIssued)
                  : undefined,
                expiryDate: cert.expiryDate
                  ? new Date(cert.expiryDate)
                  : undefined,
              }))
            : registerConsultantDto.certifications?.map((cert) => ({
                ...cert,
                dateIssued: cert.dateIssued
                  ? new Date(cert.dateIssued)
                  : undefined,
                expiryDate: cert.expiryDate
                  ? new Date(cert.expiryDate)
                  : undefined,
              })),
        // Parse emergency contact
        emergencyContact:
          typeof registerConsultantDto.emergencyContact === 'string'
            ? JSON.parse(registerConsultantDto.emergencyContact)
            : registerConsultantDto.emergencyContact,
        // Parse bank details
        bankDetails:
          typeof registerConsultantDto.bankDetails === 'string'
            ? JSON.parse(registerConsultantDto.bankDetails)
            : registerConsultantDto.bankDetails,
        // Parse mpesa details
        mpesaDetails:
          typeof registerConsultantDto.mpesaDetails === 'string'
            ? JSON.parse(registerConsultantDto.mpesaDetails)
            : registerConsultantDto.mpesaDetails,
        preferredWorkTypes: registerConsultantDto.preferredWorkTypes,
        cvUrl: cvResult.secure_url,
        academicCertificates,
        status: 'pending',
        roles: ['consultant'],
      };

      // Validate parsed data structure
      if (!Array.isArray(parsedData.skills) || !parsedData.skills.length) {
        throw new BadRequestException('Skills must be a non-empty array');
      }
      if (
        !Array.isArray(parsedData.education) ||
        !parsedData.education.length
      ) {
        throw new BadRequestException('Education must be a non-empty array');
      }

      // Register consultant
      return this.consultantService.register(parsedData, req);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process registration: ${error.message}`,
      );
    }
  }

  @Public()
  @Post('organization/register')
  @ApiOperation({
    summary: 'Register a new organization consultant',
    description: `Register a new organization as a consultant with all required details and documents.
    
    Required documents:
    - Certificate of Registration (PDF format)
    - KRA Certificate (PDF format)
    - Tax Compliance Certificate (PDF format)
    - CR12 Document (PDF format)
    
    Note: 
    - All documents must be in PDF format
    - The organization's status will be set to 'pending' until approved by an admin`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', example: 'Tech Solutions Ltd' },
        registrationNumber: { type: 'string', example: 'PVT-123456' },
        kraPin: { type: 'string', example: 'P051234567X' },
        businessEmail: { type: 'string', example: 'info1@techsolutions.co.ke' },
        businessPhone: { type: 'string', example: '254720123456' },
        alternativePhoneNumber: { type: 'string', example: '254720123456' },
        businessAddress: {
          type: 'string',
          example: 'Westlands Business Park, Block A',
        },
        postalAddress: { type: 'string', example: 'P.O. Box 12345-00100' },
        county: { type: 'string', example: 'Nairobi' },
        yearsOfOperation: { type: 'number', example: 5 },
        hourlyRate: { type: 'number', example: 5000 },
        taxComplianceExpiryDate: {
          type: 'string',
          format: 'date',
          example: '2025-12-31',
        },
        servicesOffered: {
          type: 'array',
          items: { type: 'string' },
          example: ['Software Development', 'IT Consulting', 'Cloud Solutions'],
        },
        industries: {
          type: 'array',
          items: { type: 'string' },
          example: ['Technology', 'Finance', 'Healthcare'],
        },
        contactPerson: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe' },
            position: { type: 'string', example: 'Managing Director' },
            email: { type: 'string', example: 'john.doe@techsolutions.co.ke' },
            phoneNumber: { type: 'string', example: '254712345678' },
            alternativePhoneNumber: { type: 'string', example: '254723456789' },
          },
        },
        bankDetails: {
          type: 'object',
          properties: {
            bankName: { type: 'string', example: 'Equity Bank' },
            accountName: { type: 'string', example: 'Tech Solutions Ltd' },
            accountNumber: { type: 'string', example: '1234567890' },
            branchCode: { type: 'string', example: '123' },
            swiftCode: { type: 'string', example: 'EQBLKENA' },
          },
        },
        registrationCertificate: { type: 'string', format: 'binary' },
        kraCertificate: { type: 'string', format: 'binary' },
        taxComplianceCertificate: { type: 'string', format: 'binary' },
        cr12Document: { type: 'string', format: 'binary' },
      },
      required: [
        'companyName',
        'registrationNumber',
        'kraPin',
        'businessEmail',
        'businessPhone',
        'businessAddress',
        'county',
        'yearsOfOperation',
        'hourlyRate',
        'servicesOffered',
        'industries',
        'contactPerson',
        'bankDetails',
        'registrationCertificate',
        'kraCertificate',
        'taxComplianceCertificate',
        'cr12Document',
        'taxComplianceExpiryDate',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Organization registered successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or missing required fields/documents.',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'registrationCertificate', maxCount: 1 },
        { name: 'kraCertificate', maxCount: 1 },
        { name: 'taxComplianceCertificate', maxCount: 1 },
        { name: 'cr12Document', maxCount: 1 },
      ],
      {
        fileFilter: (req, file, callback) => {
          if (file.mimetype !== 'application/pdf') {
            return callback(
              new BadRequestException('Only PDF files are allowed'),
              false,
            );
          }
          callback(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB limit
        },
      },
    ),
  )
  async registerOrganization(
    @Body() registerOrgDto: RegisterOrganizationDto,
    @Req() req: ExpressRequest,

    @UploadedFiles()
    files: {
      registrationCertificate?: Express.Multer.File[];
      kraCertificate?: Express.Multer.File[];
      taxComplianceCertificate?: Express.Multer.File[];
      cr12Document?: Express.Multer.File[];
    },
  ) {
    try {
      // Validate required files
      if (!files.registrationCertificate?.[0]) {
        throw new BadRequestException('Registration Certificate is required');
      }
      if (!files.kraCertificate?.[0]) {
        throw new BadRequestException('KRA Certificate is required');
      }
      if (!files.taxComplianceCertificate?.[0]) {
        throw new BadRequestException('Tax Compliance Certificate is required');
      }
      if (!files.cr12Document?.[0]) {
        throw new BadRequestException('CR12 Document is required');
      }

      // Validate file sizes
      const maxSize = 5 * 1024 * 1024; // 5MB
      for (const fileArray of Object.values(files)) {
        if (fileArray[0].size > maxSize) {
          throw new BadRequestException(
            `${fileArray[0].fieldname} file size should not exceed 5MB`,
          );
        }
      }

      // Upload documents to Cloudinary
      const uploadedFiles = {
        registrationCertificateUrl: (
          await this.cloudinaryService.uploadFile(
            files.registrationCertificate[0],
            'org-registration-certs',
          )
        ).secure_url,
        kraCertificateUrl: (
          await this.cloudinaryService.uploadFile(
            files.kraCertificate[0],
            'org-kra-certs',
          )
        ).secure_url,
        taxComplianceCertificateUrl: (
          await this.cloudinaryService.uploadFile(
            files.taxComplianceCertificate[0],
            'org-tax-compliance',
          )
        ).secure_url,
        cr12Url: (
          await this.cloudinaryService.uploadFile(
            files.cr12Document[0],
            'org-cr12',
          )
        ).secure_url,
      };

      // Parse data with error handling
      const parsedData = {
        ...registerOrgDto,
        // Ensure date is in correct format
        taxComplianceExpiryDate: registerOrgDto.taxComplianceExpiryDate,
        // Parse arrays - handle both array and form-data array format
        servicesOffered: Array.isArray(registerOrgDto.servicesOffered)
          ? registerOrgDto.servicesOffered
          : typeof registerOrgDto.servicesOffered === 'string'
            ? [registerOrgDto.servicesOffered] // Single string value
            : Object.keys(registerOrgDto)
                .filter((key) => key.startsWith('servicesOffered['))
                .map((key) => registerOrgDto[key]),
        industries: Array.isArray(registerOrgDto.industries)
          ? registerOrgDto.industries
          : typeof registerOrgDto.industries === 'string'
            ? [registerOrgDto.industries] // Single string value
            : Object.keys(registerOrgDto)
                .filter((key) => key.startsWith('industries['))
                .map((key) => registerOrgDto[key]),
        // Parse objects
        contactPerson:
          typeof registerOrgDto.contactPerson === 'string'
            ? JSON.parse(registerOrgDto.contactPerson)
            : registerOrgDto.contactPerson,
        bankDetails:
          typeof registerOrgDto.bankDetails === 'string'
            ? JSON.parse(registerOrgDto.bankDetails)
            : registerOrgDto.bankDetails,
        // Add file URLs and status
        ...uploadedFiles,
        status: 'pending',
      };

      // Validate parsed data structure
      if (
        !Array.isArray(parsedData.servicesOffered) ||
        !parsedData.servicesOffered.length
      ) {
        throw new BadRequestException(
          'Services offered must be a non-empty array',
        );
      }
      if (
        !Array.isArray(parsedData.industries) ||
        !parsedData.industries.length
      ) {
        throw new BadRequestException('Industries must be a non-empty array');
      }
      if (
        !parsedData.contactPerson?.name ||
        !parsedData.contactPerson?.email ||
        !parsedData.contactPerson?.phoneNumber
      ) {
        throw new BadRequestException(
          'Contact person must include name, email, and phone number',
        );
      }
      if (
        !parsedData.bankDetails?.bankName ||
        !parsedData.bankDetails?.accountNumber
      ) {
        throw new BadRequestException(
          'Bank details must include bank name and account number',
        );
      }

      // Register organization
      return this.consultantService.registerOrganization(parsedData, req);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process registration: ${error.message}`,
      );
    }
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'hr')
  @ApiOperation({ summary: 'Get all pending consultant applications' })
  async getPendingConsultants() {
    return this.consultantService.getPendingConsultants();
  }

  @Get('organizations')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'hr')
  async getOrganizations() {
    return this.consultantService.getOrganizations();
  }

  @Get('organization/:id')
  @Public()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'hr')
  async getOrganization(@Param('id') id: string) {
    return this.consultantService.getOrganization(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'hr')
  @ApiOperation({ summary: 'Approve a consultant application' })
  async approveConsultant(@Param('id') id: string) {
    return this.consultantService.approveConsultant(id);
  }

  @Patch('organization/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'hr')
  async approveOrganization(@Param('id') id: string) {
    return this.consultantService.approveOrganization(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'hr')
  @ApiOperation({ summary: 'Reject a consultant application' })
  async rejectConsultant(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.consultantService.rejectConsultant(id, reason);
  }

  @Patch('organization/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'hr')
  async rejectOrganization(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.consultantService.rejectOrganization(id, reason);
  }

  //update consultant
  @Patch('organization/update/:id')
  @Public()
  @ApiOperation({
    summary: 'Update organization by MongoDB ID',
    description:
      'Update an existing organization using its MongoDB ObjectId. All fields are optional for partial updates.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the organization',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
  })
  @ApiBody({
    type: UpdateOrganizationDto,
    description: 'Organization update data. All fields are optional.',
    examples: {
      'Basic Update': {
        value: {
          companyName: 'Updated Tech Solutions Ltd',
          businessPhone: '0712345679',
          website: 'https://updated-techsolutions.co.ke',
        },
      },
      'Contact Person Update': {
        value: {
          contactPerson: {
            name: 'Jane Smith',
            position: 'Operations Manager',
            email: 'jane.smith@company.com',
          },
        },
      },
      'Status Update': {
        value: {
          status: 'active',
          isEmailVerified: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization updated successfully',
    type: UpdateOrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or organization ID format',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Duplicate unique field (email, registration number, etc.)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async updateById(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
  ): Promise<UpdateOrganizationResponseDto> {
    try {
      const updatedOrganization = await this.organizationService.updateById(
        id,
        updateDto,
      );

      const response: UpdateOrganizationResponseDto = {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Organization updated successfully',
        data: updatedOrganization,
        timestamp: new Date().toISOString(),
      };

      return response;
    } catch (error) {
      // Re-throw HttpExceptions as-is (they have proper status codes)
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error occurred while updating organization',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('consultant/update/:id')
  @HttpCode(HttpStatus.OK)
  // @Roles('consultant')
  @Public()
  @ApiOperation({
    summary: 'Update user by ID',
    description:
      'Updates a user profile with the provided data. Only fields provided in the request body will be updated. All validation rules will be applied.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (MongoDB ObjectId)',
    example: '64f123abc123def456789012',
    type: 'string',
  })
  @ApiBody({
    type: UserDto,
    description:
      'User data to update. All fields are optional - only provided fields will be updated.',
    examples: {
      'basic-update': {
        summary: 'Basic profile update',
        description: 'Update basic user information',
        value: {
          firstName: 'Jane',
          lastName: 'Wanjiku',
          phoneNumber: '+254712345678',
          physicalAddress: 'Westlands, Nairobi',
          county: 'Nairobi',
        },
      },
      'professional-update': {
        summary: 'Professional information update',
        description: 'Update professional details and skills',
        value: {
          position: 'Senior Software Engineer',
          department: 'Technology',
          hourlyRate: 6000,
          availability: 'available',
          preferredWorkTypes: ['remote', 'hybrid'],
          skills: [
            {
              name: 'JavaScript',
              yearsOfExperience: 5,
              proficiencyLevel: 'Expert',
            },
            {
              name: 'React',
              yearsOfExperience: 4,
              proficiencyLevel: 'Expert',
            },
          ],
        },
      },
      'status-update': {
        summary: 'Status update',
        description: 'Update user status and availability',
        value: {
          status: 'active',
          availability: 'partially_available',
          registrationStatus: 'complete',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully updated',
    type: UserResponseDto,
    example: {
      _id: '64f123abc123def456789012',
      firstName: 'Jane',
      lastName: 'Wanjiku',
      email: 'jane.wanjiku@company.com',
      phoneNumber: '+254712345678',
      nationalId: '23456789',
      employeeId: 'CON-001',
      status: 'active',
      registrationStatus: 'complete',
      availability: 'available',
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-20T14:45:00.000Z',
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or user ID format',
    type: ValidationErrorResponseDto,
    examples: {
      'invalid-id': {
        summary: 'Invalid user ID format',
        value: {
          statusCode: 400,
          message: 'Invalid user ID format',
          error: 'Bad Request',
          timestamp: '2024-01-20T14:45:00.000Z',
          path: '/users/invalid-id',
        },
      },
      'validation-error': {
        summary: 'Validation error',
        value: {
          statusCode: 400,
          message: [
            'email must be a valid email',
            'phoneNumber must be a valid phone number',
            'Hourly rate cannot be negative',
          ],
          error: 'Bad Request',
          timestamp: '2024-01-20T14:45:00.000Z',
          path: '/users/64f123abc123def456789012',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
    example: {
      statusCode: 404,
      message: 'User with ID 64f123abc123def456789012 not found',
      error: 'Not Found',
      timestamp: '2024-01-20T14:45:00.000Z',
      path: '/users/64f123abc123def456789012',
    },
  })
  @ApiConflictResponse({
    description:
      'Unique constraint violation (email, phone, or national ID already exists)',
    type: ErrorResponseDto,
    example: {
      statusCode: 409,
      message: 'The following fields already exist: email, phoneNumber',
      error: 'Conflict',
      timestamp: '2024-01-20T14:45:00.000Z',
      path: '/users/64f123abc123def456789012',
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
    example: {
      statusCode: 500,
      message: 'An unexpected error occurred while updating user',
      error: 'Internal Server Error',
      timestamp: '2024-01-20T14:45:00.000Z',
      path: '/users/64f123abc123def456789012',
    },
  })
  async updateUserById(
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: true,
        validationError: {
          target: false,
          value: false,
        },
      }),
    )
    updateUserDto: Partial<UserDto>,
  ): Promise<UserResponseDto> {
    try {
      const updatedUser = await this.userService.updateUserById(
        id,
        updateUserDto,
      );

      return updatedUser.toObject() as UserResponseDto;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id/complete-registration')
  @Public()
  @ApiOperation({ summary: 'Mark consultant registration as complete' })
  @ApiResponse({
    status: 200,
    description: 'Registration completed successfully.',
  })
  @ApiResponse({ status: 404, description: 'Consultant not found.' })
  @ApiParam({ name: 'id', description: 'Consultant ID' })
  async completeConsultantRegistration(@Param('id') id: string) {
    try {
      const updatedUser = await this.userService.updateUserById(id, {
        registrationStatus: 'complete',
      });
      return {
        message: 'Consultant registration completed successfully.',
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Consultant not found.');
      }
      throw new HttpException(
        'An unexpected error occurred.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('organization/:id/complete-registration')
  @Public()
  @ApiOperation({ summary: 'Mark organization registration as complete' })
  @ApiResponse({
    status: 200,
    description: 'Registration completed successfully.',
  })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async completeOrganizationRegistration(@Param('id') id: string) {
    try {
      const updatedOrg =
        await this.organizationService.organizationCompleteRegistration(id, {
          registrationStatus: 'complete',
        });
      return {
        message: 'Organization registration completed successfully.',
        organization: updatedOrg,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Organization not found.');
      }
      throw new HttpException(
        'An unexpected error occurred.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
