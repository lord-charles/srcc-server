import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
  constructor(private readonly invoiceService: InvoiceService) {}

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
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @ApiResponse({
    status: 200,
    description: 'Payment recorded successfully',
    type: Invoice,
  })
  async recordPayment(
    @Param('id') id: string,
    @Req() req: any,

    @Body() dto: CreatePaymentDto,
  ): Promise<Invoice> {
    return this.invoiceService.recordPayment(
      new Types.ObjectId(id),
      req.user.id,
      dto,
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
