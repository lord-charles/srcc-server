import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ContractorService } from './contractor.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('contractors')
@Controller('contractors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractorController {
  constructor(
    private readonly contractorService: ContractorService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new contractor',
    description: `Creates a new contractor with the provided details and required documents.
    
    Required documents:
    - Certificate of Incorporation
    - CR12 Document
    - KRA PIN Certificate
    - TCC Certificate
    
    All documents should be in PDF format.`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'fullName',
        'registrationNumber',
        'registrationYear',
        'kraPinNumber',
        'companyContactDetails',
        'contactPersonDetails',
        'tccNumber'
      ],
      properties: {
        fullName: {
          type: 'string',
          description: 'Full name of the contractor company',
          example: 'ABC Construction Ltd'
        },
        registrationNumber: {
          type: 'string',
          description: 'Company registration number',
          example: 'REG123456'
        },
        registrationYear: {
          type: 'number',
          description: 'Year of registration',
          example: 2020
        },
        kraPinNumber: {
          type: 'string',
          description: 'KRA PIN number',
          example: 'A123456789B'
        },
        companyContactDetails: {
          type: 'string',
          description: 'Company contact details as JSON string',
          example: '{"email":"company@example.com","phone":"+254123456789","address":"Company Address"}'
        },
        contactPersonDetails: {
          type: 'string',
          description: 'Contact person details as JSON string',
          example: '{"name":"John Doe","position":"Manager","phone":"+254123456789","email":"john@example.com"}'
        },
        tccNumber: {
          type: 'string',
          description: 'Tax Compliance Certificate number',
          example: 'TCC123456'
        },
        certificateOfIncorporation: {
          type: 'string',
          format: 'binary',
          description: 'Certificate of Incorporation (PDF format)'
        },
        cr12Document: {
          type: 'string',
          format: 'binary',
          description: 'CR12 Document (PDF format)'
        },
        kraPinCertificate: {
          type: 'string',
          format: 'binary',
          description: 'KRA PIN Certificate (PDF format)'
        },
        tccCertificate: {
          type: 'string',
          format: 'binary',
          description: 'Tax Compliance Certificate (PDF format)'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Contractor created successfully.',
    type: CreateContractorDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or missing required fields.'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token.'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have permission to create contractors.'
  })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'certificateOfIncorporation', maxCount: 1 },
    { name: 'cr12Document', maxCount: 1 },
    { name: 'kraPinCertificate', maxCount: 1 },
    { name: 'tccCertificate', maxCount: 1 }
  ]))
  async create(
    @Body() createContractorDto: CreateContractorDto,
    @UploadedFiles() files: {
      certificateOfIncorporation?: Express.Multer.File[];
      cr12Document?: Express.Multer.File[];
      kraPinCertificate?: Express.Multer.File[];
      tccCertificate?: Express.Multer.File[];
    },
  ) {
    try {
      // Parse the registration year to number
      createContractorDto.registrationYear = Number(createContractorDto.registrationYear);

      // Validate required files
      if (!files?.certificateOfIncorporation?.[0]) {
        throw new BadRequestException('Certificate of Incorporation is required');
      }
      if (!files?.cr12Document?.[0]) {
        throw new BadRequestException('CR12 Document is required');
      }
      if (!files?.kraPinCertificate?.[0]) {
        throw new BadRequestException('KRA PIN Certificate is required');
      }
      if (!files?.tccCertificate?.[0]) {
        throw new BadRequestException('Tax Compliance Certificate is required');
      }

      // Upload files to Cloudinary
      const [
        certificateOfIncorporationResult,
        cr12DocumentResult,
        kraPinCertificateResult,
        tccCertificateResult
      ] = await Promise.all([
        this.cloudinaryService.uploadFile(files.certificateOfIncorporation[0], 'contractor-documents/incorporation'),
        this.cloudinaryService.uploadFile(files.cr12Document[0], 'contractor-documents/cr12'),
        this.cloudinaryService.uploadFile(files.kraPinCertificate[0], 'contractor-documents/kra'),
        this.cloudinaryService.uploadFile(files.tccCertificate[0], 'contractor-documents/tcc')
      ]);

      // Create contractor data with file URLs
      const contractorData = {
        ...createContractorDto,
        certificateOfIncorporationUrl: certificateOfIncorporationResult.secure_url,
        cr12DocumentUrl: cr12DocumentResult.secure_url,
        kraPinCertificateUrl: kraPinCertificateResult.secure_url,
        tccCertificateUrl: tccCertificateResult.secure_url
      };

      return this.contractorService.create(contractorData);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON format for companyContactDetails or contactPersonDetails');
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all contractors' })
  @ApiResponse({ status: 200, description: 'Return all contractors.' })
  findAll() {
    return this.contractorService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contractor by id' })
  @ApiResponse({ status: 200, description: 'Return the contractor.' })
  @ApiResponse({ status: 404, description: 'Contractor not found.' })
  findOne(@Param('id') id: string) {
    return this.contractorService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contractor' })
  @ApiResponse({ status: 200, description: 'Contractor updated successfully.' })
  @ApiResponse({ status: 404, description: 'Contractor not found.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          description: 'Full name of the contractor company',
          example: 'ABC Construction Ltd'
        },
        registrationNumber: {
          type: 'string',
          description: 'Company registration number',
          example: 'REG123456'
        },
        registrationYear: {
          type: 'number',
          description: 'Year of registration',
          example: 2020
        },
        kraPinNumber: {
          type: 'string',
          description: 'KRA PIN number',
          example: 'A123456789B'
        },
        companyContactDetails: {
          type: 'string',
          description: 'Company contact details as JSON string',
          example: '{"email":"company@example.com","phone":"+254123456789","address":"Company Address"}'
        },
        contactPersonDetails: {
          type: 'string',
          description: 'Contact person details as JSON string',
          example: '{"name":"John Doe","position":"Manager","phone":"+254123456789","email":"john@example.com"}'
        },
        tccNumber: {
          type: 'string',
          description: 'Tax Compliance Certificate number',
          example: 'TCC123456'
        },
        certificateOfIncorporation: {
          type: 'string',
          format: 'binary',
          description: 'Certificate of Incorporation (PDF format)'
        },
        cr12Document: {
          type: 'string',
          format: 'binary',
          description: 'CR12 Document (PDF format)'
        },
        kraPinCertificate: {
          type: 'string',
          format: 'binary',
          description: 'KRA PIN Certificate (PDF format)'
        },
        tccCertificate: {
          type: 'string',
          format: 'binary',
          description: 'Tax Compliance Certificate (PDF format)'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Contractor updated successfully.',
    type: UpdateContractorDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or missing required fields.'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token.'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have permission to update contractors.'
  })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'certificateOfIncorporation', maxCount: 1 },
    { name: 'cr12Document', maxCount: 1 },
    { name: 'kraPinCertificate', maxCount: 1 },
    { name: 'tccCertificate', maxCount: 1 }
  ]))  
  async update(
    @Param('id') id: string,
    @Body() updateContractorDto: UpdateContractorDto,
    @UploadedFiles() files: {
      certificateOfIncorporation?: Express.Multer.File[];
      cr12Document?: Express.Multer.File[];
      kraPinCertificate?: Express.Multer.File[];
      tccCertificate?: Express.Multer.File[];
    },
  ) {
    const uploadedFiles: any = {};

    // Upload any new files provided
    if (files.certificateOfIncorporation?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.certificateOfIncorporation[0],
        'contractor-documents/incorporation'
      );
      uploadedFiles.certificateOfIncorporationUrl = result.secure_url;
    }

    if (files.cr12Document?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.cr12Document[0],
        'contractor-documents/cr12'
      );
      uploadedFiles.cr12DocumentUrl = result.secure_url;
    }

    if (files.kraPinCertificate?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.kraPinCertificate[0],
        'contractor-documents/kra'
      );
      uploadedFiles.kraPinCertificateUrl = result.secure_url;
    }

    if (files.tccCertificate?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.tccCertificate[0],
        'contractor-documents/tcc'
      );
      uploadedFiles.tccCertificateUrl = result.secure_url;
    }

    const updateData = {
      ...updateContractorDto,
      ...uploadedFiles
    };

    return this.contractorService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contractor' })
  @ApiResponse({ status: 200, description: 'Contractor deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Contractor not found.' })
  remove(@Param('id') id: string) {
    return this.contractorService.remove(id);
  }
}
