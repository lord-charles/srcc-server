import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Patch,
  Param,
  UseGuards,
  Get,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterConsultantDto } from './dto/register-consultant.dto';
import { ConsultantService } from './consultant.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('consultants')
@Controller('consultants')
export class ConsultantController {
  constructor(
    private readonly consultantService: ConsultantService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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
    - The consultant's status will be set to 'pending' until approved by an admin`
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
        password: { type: 'string' },
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
                example: 'Expert'
              }
            }
          }
        },
        education: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              institution: { type: 'string', example: 'University of Nairobi' },
              qualification: { type: 'string', example: 'Bachelor of Science in Computer Science' },
              yearOfCompletion: { type: 'string', example: '2020' }
            }
          }
        },
        academicCertificates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Bachelor of Science' },
              institution: { type: 'string', example: 'University of Nairobi' },
              yearOfCompletion: { type: 'string', example: '2020' }
            }
          }
        },
        certifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'PMP' },
              issuingOrganization: { type: 'string', example: 'PMI' },
              dateIssued: { type: 'string', format: 'date', example: '2023-01-15' },
              expiryDate: { type: 'string', format: 'date', example: '2026-01-15' },
              certificationId: { type: 'string', example: 'PMP123456' }
            }
          }
        },
        yearsOfExperience: { type: 'number', example: 8 },
        hourlyRate: { type: 'number', example: 5000 },
        preferredWorkTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['remote', 'onsite', 'hybrid']
          },
          example: ['remote', 'hybrid']
        },
        department: { type: 'string', example: 'Software Engineering' },
        emergencyContact: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe' },
            relationship: { type: 'string', example: 'Spouse' },
            phoneNumber: { type: 'string', example: '+254712345678' },
            alternativePhoneNumber: { type: 'string', example: '+254723456789' }
          }
        },
        bankDetails: {
          type: 'object',
          properties: {
            bankName: { type: 'string', example: 'Equity Bank' },
            accountNumber: { type: 'string', example: '1234567890' },
            branchCode: { type: 'string', example: '123' }
          }
        },
        mpesaDetails: {
          type: 'object',
          properties: {
            phoneNumber: { type: 'string', example: '+254712345678' }
          }
        },
        nssfNumber: { type: 'string', example: '1234567890' },
        nhifNumber: { type: 'string', example: '1234567890' },
        nssfDeduction: { type: 'number', example: 1000 },
        nhifDeduction: { type: 'number', example: 500 },
        cv: { type: 'string', format: 'binary' },
        academicCertificateFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' }
        }
      },
      required: [
        'firstName', 'lastName', 'email', 'password', 'phoneNumber',
        'nationalId', 'kraPinNumber', 'dateOfBirth', 'physicalAddress',
        'county', 'skills', 'education', 'academicCertificates',
        'yearsOfExperience', 'hourlyRate', 'preferredWorkTypes',
        'department', 'emergencyContact', 'preferredPaymentMethod',
        'nssfNumber', 'nhifNumber', 'nssfDeduction', 'nhifDeduction',
        'cv', 'academicCertificateFiles'
      ]
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Consultant registered successfully.'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or missing required fields/documents.'
  })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'cv', maxCount: 1 },
    { name: 'academicCertificateFiles', maxCount: 5 }
  ], {
    fileFilter: (req, file, callback) => {

      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  }))
  async register(
    @Body() registerConsultantDto: RegisterConsultantDto,
    @UploadedFiles() files: {
      cv?: Express.Multer.File[],
      academicCertificateFiles?: Express.Multer.File[],
    },
  ) {
    try {
      // Validate required files
      if (!files.cv?.[0]) {
        throw new BadRequestException('CV/Resume is required');
      }
      if (!files.academicCertificateFiles?.length) {
        throw new BadRequestException('At least one academic certificate is required');
      }
      if (files.academicCertificateFiles.length > 5) {
        throw new BadRequestException('Maximum 5 academic certificates are allowed');
      }

      // Validate file sizes
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (files.cv[0].size > maxSize) {
        throw new BadRequestException('CV file size should not exceed 5MB');
      }
      for (const file of files.academicCertificateFiles) {
        if (file.size > maxSize) {
          throw new BadRequestException('Academic certificate file size should not exceed 5MB');
        }
      }

      // Upload CV
      const cvResult = await this.cloudinaryService.uploadFile(files.cv[0], 'consultant-cvs');

      // Upload and process academic certificates
      const academicCertificates = await Promise.all(
        files.academicCertificateFiles.map(async (file, index) => {
          const result = await this.cloudinaryService.uploadFile(file, 'consultant-academic-certs');
          const certDetails = registerConsultantDto.academicCertificates[index];
          return {
            name: certDetails.name,
            institution: certDetails.institution,
            yearOfCompletion: certDetails.yearOfCompletion,
            documentUrl: result.secure_url
          };
        })
      );



      // Parse data with error handling
      const parsedData = {
        ...registerConsultantDto,
        dateOfBirth: new Date(registerConsultantDto.dateOfBirth),
        // Parse skills array - handle both string array and direct array
        skills: Array.isArray(registerConsultantDto.skills)
          ? registerConsultantDto.skills.map(skill =>
            typeof skill === 'string' ? JSON.parse(skill)[0] : skill
          )
          : JSON.parse(registerConsultantDto.skills),
        // Parse education array - handle both string array and direct array
        education: Array.isArray(registerConsultantDto.education)
          ? registerConsultantDto.education.map(edu =>
            typeof edu === 'string' ? JSON.parse(edu)[0] : edu
          )
          : JSON.parse(registerConsultantDto.education),
        // Parse certifications and their dates - handle both string array and direct array
        certifications: typeof registerConsultantDto.certifications === 'string'
          ? JSON.parse(registerConsultantDto.certifications).map(cert => ({
            ...cert,
            dateIssued: cert.dateIssued ? new Date(cert.dateIssued) : undefined,
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined
          }))
          : registerConsultantDto.certifications?.map(cert => ({
            ...cert,
            dateIssued: cert.dateIssued ? new Date(cert.dateIssued) : undefined,
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined
          })),
        // Parse emergency contact
        emergencyContact: typeof registerConsultantDto.emergencyContact === 'string'
          ? JSON.parse(registerConsultantDto.emergencyContact)
          : registerConsultantDto.emergencyContact,
        // Parse bank details
        bankDetails: typeof registerConsultantDto.bankDetails === 'string'
          ? JSON.parse(registerConsultantDto.bankDetails)
          : registerConsultantDto.bankDetails,
        // Parse mpesa details
        mpesaDetails: typeof registerConsultantDto.mpesaDetails === 'string'
          ? JSON.parse(registerConsultantDto.mpesaDetails)
          : registerConsultantDto.mpesaDetails,
        preferredWorkTypes: registerConsultantDto.preferredWorkTypes,
        cvUrl: cvResult.secure_url,
        academicCertificates,
        status: 'pending',
        roles: ['consultant']
      };

      // Validate parsed data structure
      if (!Array.isArray(parsedData.skills) || !parsedData.skills.length) {
        throw new BadRequestException('Skills must be a non-empty array');
      }
      if (!Array.isArray(parsedData.education) || !parsedData.education.length) {
        throw new BadRequestException('Education must be a non-empty array');
      }

      // Register consultant
      return this.consultantService.register(parsedData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to process registration: ${error.message}`);
    }
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'hr')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending consultant applications' })
  async getPendingConsultants() {
    return this.consultantService.getPendingConsultants();
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'hr')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a consultant application' })
  async approveConsultant(@Param('id') id: string) {
    return this.consultantService.approveConsultant(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'hr')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a consultant application' })
  async rejectConsultant(
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.consultantService.rejectConsultant(id, reason);
  }
}
