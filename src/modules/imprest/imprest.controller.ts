import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ImprestService } from './imprest.service';
import { CreateImprestDto } from './dto/create-imprest.dto';
import { ImprestApprovalDto, ImprestRejectionDto, ImprestAccountingDto, ReceiptDto, ImprestDisbursementDto } from './dto/imprest-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Imprest')
@Controller('imprest')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImprestController {
  constructor(
    private readonly imprestService: ImprestService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new imprest request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentReason: { type: 'string', example: 'TOTEMK Google Cloud Payment' },
        currency: { type: 'string', example: 'USD' },
        amount: { type: 'number', example: 1048.59 },
        paymentType: { 
          type: 'string', 
          enum: ['Contingency Cash', 'Travel Cash', 'Purchase Cash', 'Others'],
          example: 'Contingency Cash'
        },
        explanation: { type: 'string', example: 'January 2024 - January 2025' },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['paymentReason', 'currency', 'amount', 'paymentType', 'explanation'],
    },
  })
  @ApiResponse({ status: 201, description: 'Imprest request created successfully.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'attachments', maxCount: 15 },
    ]),
  )
  async create(
    @Body() createImprestDto: CreateImprestDto, 
    @Req() req: any,
    @UploadedFiles() files: { attachments?: Express.Multer.File[] }
  ) {
    const attachments = [];
    
    if (files?.attachments?.length) {
      const uploadPromises = files.attachments.map(file => 
        this.cloudinaryService.uploadFile(file, 'imprest-attachments')
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      for (let i = 0; i < uploadResults.length; i++) {
        attachments.push({
          fileName: files.attachments[i].originalname,
          fileUrl: uploadResults[i].secure_url,
          uploadedAt: new Date(),
        });
      }
    }
    
    return this.imprestService.create(createImprestDto, req.user.id, attachments);
  }

  @Get()
  @ApiOperation({ summary: 'Get all imprest requests with optional filters' })
  @ApiResponse({ status: 200, description: 'Returns all imprest requests.' })
  async findAll(
  ) { 
    const filters = {};
    // if (status) filters['status'] = status;
    // if (department) filters['department'] = department;
    // if (requestedBy) filters['requestedBy'] = requestedBy;

    return this.imprestService.findAll(filters);
  }

  @Get('my-imprest')
  @ApiOperation({ summary: 'Get all imprest requests created by the user' })
  @ApiResponse({ status: 200, description: 'Returns all imprest requests created by the user.' })
  async findMyImprests(@Req() req: any) {
    return this.imprestService.findMyImprests(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific imprest request' })
  @ApiResponse({ status: 200, description: 'Returns the imprest request.' })
  @ApiResponse({ status: 404, description: 'Imprest request not found.' })
  async findOne(@Param('id') id: string) {
    return this.imprestService.findOne(id);
  }

  @Post(':id/approve/hod')
  @Roles('hod')
  @ApiOperation({ summary: 'Approve imprest request by HOD' })
  @ApiResponse({ status: 200, description: 'Imprest request approved by HOD.' })
  async approveByHod(
    @Param('id') id: string,
     @Req() req: any,
    @Body() approvalDto: ImprestApprovalDto,
  ) {
    return this.imprestService.approveByHod(id, req.user.id, approvalDto);
  }

  @Post(':id/approve/accountant')
  @Roles('accountant')
  @ApiOperation({ summary: 'Approve imprest request by accountant' })
  @ApiResponse({ status: 200, description: 'Imprest request approved by accountant.' })
  async approveByAccountant(
    @Param('id') id: string,
     @Req() req: any,
    @Body() approvalDto: ImprestApprovalDto,
  ) {
    return this.imprestService.approveByAccountant(id, req.user.id, approvalDto);
  }

  @Post(':id/reject')
  @Roles('hod', 'accountant')
  @ApiOperation({ summary: 'Reject imprest request' })
  @ApiResponse({ status: 200, description: 'Imprest request rejected.' })
  async reject(
    @Param('id') id: string,
     @Req() req: any,
    @Body() rejectionDto: ImprestRejectionDto,
  ) {
    return this.imprestService.reject(id, req.user.id, rejectionDto);
  }

  @Post(':id/disburse')
  @Roles('accountant')
  @ApiOperation({ summary: 'Record imprest disbursement' })
  @ApiResponse({ status: 200, description: 'Imprest disbursement recorded.' })
  async recordDisbursement(
    @Param('id') id: string,
    @Req() req: any,
    @Body() disbursementDto: ImprestDisbursementDto,
  ) {
    if (!disbursementDto.amount || disbursementDto.amount <= 0) {
      throw new BadRequestException('Valid disbursement amount is required');
    }
    return this.imprestService.recordDisbursement(id, req.user.id, disbursementDto);
  }

  @Post(':id/account')
  @ApiOperation({ summary: 'Submit imprest accounting' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        receipts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', example: 'Office supplies' },
              amount: { type: 'number', example: 150.75 },
            },
          },
        },
        comments: { type: 'string' },
        receiptFiles: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['receipts', 'receiptFiles'],
    },
  })
  @ApiResponse({ status: 200, description: 'Imprest accounting submitted.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'receiptFiles', maxCount: 10 },
    ]),
  )
  async submitAccounting(
    @Param('id') id: string,
    @Req() req: any,
    @Body() accountingDto: any,
    @UploadedFiles() files: { receiptFiles?: Express.Multer.File[] }
  ) {
    if (!files?.receiptFiles?.length) {
      throw new BadRequestException('Receipt files are required');
    }

    // Parse or get receipts data
    let receipts: ReceiptDto[];
    try {
      // Check if receipts is already an array or needs to be parsed
      receipts = typeof accountingDto.receipts === 'string' 
        ? JSON.parse(accountingDto.receipts) 
        : accountingDto.receipts;
        
      if (!Array.isArray(receipts) || receipts.length === 0) {
        throw new BadRequestException('Valid receipts data is required');
      }
      
      if (receipts.length !== files.receiptFiles.length) {
        throw new BadRequestException('Number of receipt files must match number of receipt entries');
      }
    } catch (error) {
      console.log("error", error);
      throw new BadRequestException('Invalid receipts data format');
    }

    // Upload receipt files
    const processedReceipts = [];
    
    for (let i = 0; i < files.receiptFiles.length; i++) {
      const file = files.receiptFiles[i];
      const receipt = receipts[i];
      
      const uploadResult = await this.cloudinaryService.uploadFile(file, 'imprest-receipts');
      
      processedReceipts.push({
        description: receipt.description,
        amount: receipt.amount,
        receiptUrl: uploadResult.secure_url,
        uploadedAt: new Date(),
      });
    }

    return this.imprestService.submitAccounting(
      id, 
      req.user.id, 
      { receipts, comments: accountingDto.comments }, 
      processedReceipts
    );
  }
}
