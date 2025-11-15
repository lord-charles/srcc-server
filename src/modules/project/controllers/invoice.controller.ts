import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InvoiceService } from '../services/invoice.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  CreatePaymentDto,
  InvoiceApprovalDto,
  InvoiceRejectionDto,
  InvoiceRevisionDto,
} from '../dto/invoice.dto';
import { Invoice } from '../schemas/invoice.schema';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    type: Invoice,
  })
  async create(
    @Req() req: any,

    @Body() dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    return this.invoiceService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice found', type: Invoice })
  async findOne(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.findOne(new Types.ObjectId(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated successfully',
    type: Invoice,
  })
  async update(
    @Param('id') id: string,
    @Req() req: any,

    @Body() dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    return this.invoiceService.update(new Types.ObjectId(id), req.user.id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit invoice for approval' })
  @ApiResponse({
    status: 200,
    description: 'Invoice submitted for approval',
    type: Invoice,
  })
  async submitForApproval(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Invoice> {
    return this.invoiceService.submitForApproval(
      new Types.ObjectId(id),
      req.user.id,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice approved', type: Invoice })
  async approve(
    @Param('id') id: string,
    @Req() req: any,

    @Body() dto: InvoiceApprovalDto,
  ): Promise<Invoice> {
    return this.invoiceService.approve(
      new Types.ObjectId(id),
      req.user.id,
      dto,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice rejected', type: Invoice })
  async reject(
    @Param('id') id: string,
    @Req() req: any,

    @Body() dto: InvoiceRejectionDto,
  ): Promise<Invoice> {
    return this.invoiceService.reject(new Types.ObjectId(id), req.user.id, dto);
  }

  @Post(':id/payments')
  @UseInterceptors(FileInterceptor('receiptFile'))
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amountPaid: { type: 'number', example: 100000 },
        paymentMethod: { type: 'string', example: 'MPESA' },
        referenceNumber: { type: 'string', example: 'QK7XLPBRN5' },
        paymentDate: { type: 'string', format: 'date', example: '2025-02-20' },
        notes: { type: 'string', example: 'First installment payment' },
        comments: { type: 'string', example: 'Payment for milestone 1' },
        receiptFile: { type: 'string', format: 'binary', description: 'Payment receipt file (PDF, image, etc.)' },
      },
      required: ['amountPaid', 'paymentMethod', 'referenceNumber', 'paymentDate']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Payment recorded successfully',
    type: Invoice,
  })
  async recordPayment(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() receiptFile: Express.Multer.File,
    @Body() dto: CreatePaymentDto,
  ): Promise<Invoice> {
    let receiptUrl: string | undefined = undefined;
    if (receiptFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(receiptFile, 'payment-receipts');
      receiptUrl = uploadResult.secure_url;
    }
    const paymentDtoWithReceipt = {
      ...dto,
      receiptUrl,
    };
    return this.invoiceService.recordPayment(
      new Types.ObjectId(id),
      req.user.id,
      paymentDtoWithReceipt,
    );
  }

  @Patch(':id/actual-invoice')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Attach or update the actual invoice document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Actual invoice PDF or document' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Actual invoice document uploaded and URL saved', type: Invoice })
  async attachOrUpdateActualInvoice(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Invoice> {
    const uploadResult = await this.cloudinaryService.uploadFile(file, 'actual-invoices');
    return this.invoiceService.attachOrUpdateActualInvoice(
      new Types.ObjectId(id),
      uploadResult.secure_url,
      req.user.id,
    );
  }

 
  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request revision for an invoice' })
  @ApiResponse({
    status: 200,
    description: 'Invoice revision requested successfully',
    type: Invoice,
  })
  async requestRevision(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: InvoiceRevisionDto,
  ): Promise<Invoice> {
    return this.invoiceService.requestRevision(
      new Types.ObjectId(id),
      req.user.id,
      dto,
    );
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all invoices for a project' })
  @ApiResponse({ status: 200, description: 'Invoices found', type: [Invoice] })
  async findByProject(
    @Param('projectId') projectId: string,
  ): Promise<Invoice[]> {
    return this.invoiceService.findByProject(new Types.ObjectId(projectId));
  }
}
