import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentRequestService } from './payment-request.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreatePaymentRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  RequestRevisionDto,
  CreateVoucherDto,
  ApproveVoucherDto,
  RejectVoucherDto,
  VoucherRevisionDto,
  PayVoucherDto,
} from './dto/payment-request.dto';

@ApiTags('Payment Requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('payment-requests')
export class PaymentRequestController {
  constructor(private readonly service: PaymentRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Payment Request' })
  async createRequest(
    @Body() dto: CreatePaymentRequestDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.createRequest(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing Payment Request' })
  async updateRequest(
    @Param('id') id: string,
    @Body() dto: CreatePaymentRequestDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.updateRequest(id, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Payment Requests' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getRequests(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    const filters: any = {};
    if (projectId) filters.projectId = projectId;
    if (status) filters.status = status;
    return this.service.getRequests(filters);
  }

  @Get('remaining-balance/:lpoId')
  @ApiOperation({ summary: 'Get remaining unpaid balance of an LPO' })
  async getLpoRemainingBalance(
    @Param('lpoId') lpoId: string,
    @Query('excludeRequestId') excludeRequestId?: string,
  ) {
    const balance = await this.service.getLpoRemainingBalance(lpoId, excludeRequestId);
    return { balance };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a Payment Request' })
  async getRequestById(@Param('id') id: string) {
    return this.service.getRequestById(id);
  }

  @Post(':id/approve')
  @Roles('hod', 'admin')
  @ApiOperation({ summary: 'Approve a Payment Request (HOD only)' })
  async approveRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.approveRequest(id, dto, userId);
  }

  @Post(':id/reject')
  @Roles('hod', 'admin')
  @ApiOperation({ summary: 'Reject a Payment Request (HOD only)' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.rejectRequest(id, dto, userId);
  }

  @Post(':id/request-revision')
  @Roles('hod', 'admin')
  @ApiOperation({ summary: 'Request revision for a Payment Request (HOD only)' })
  async requestRequestRevision(
    @Param('id') id: string,
    @Body() dto: RequestRevisionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.requestRequestRevision(id, dto, userId);
  }

  // --- VOUCHERS ENDPOINTS ---

  @Post('vouchers')
  @Roles('srcc_checker', 'admin')
  @ApiOperation({ summary: 'Generate a Payment Voucher (Finance Checker only)' })
  async createVoucher(
    @Body() dto: CreateVoucherDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.createVoucher(dto, userId);
  }

  @Put('vouchers/:id')
  @Roles('srcc_checker', 'admin')
  @ApiOperation({ summary: 'Update a Payment Voucher (Finance Checker only)' })
  async updateVoucher(
    @Param('id') id: string,
    @Body() dto: CreateVoucherDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.updateVoucher(id, dto, userId);
  }

  @Get('vouchers/all')
  @ApiOperation({ summary: 'Get all Payment Vouchers' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentRequestId', required: false })
  async getVouchers(
    @Query('status') status?: string,
    @Query('paymentRequestId') paymentRequestId?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (paymentRequestId) filters.paymentRequestId = paymentRequestId;
    return this.service.getVouchers(filters);
  }

  @Get('vouchers/:id')
  @ApiOperation({ summary: 'Get details of a Payment Voucher' })
  async getVoucherById(@Param('id') id: string) {
    return this.service.getVoucherById(id);
  }

  @Post('vouchers/:id/approve')
  @Roles('srcc_finance', 'admin')
  @ApiOperation({ summary: 'Approve a Payment Voucher (Finance Approver only)' })
  async approveVoucher(
    @Param('id') id: string,
    @Body() dto: ApproveVoucherDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.approveVoucher(id, dto, userId);
  }

  @Post('vouchers/:id/reject')
  @Roles('srcc_finance', 'admin')
  @ApiOperation({ summary: 'Reject a Payment Voucher (Finance Approver only)' })
  async rejectVoucher(
    @Param('id') id: string,
    @Body() dto: RejectVoucherDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.rejectVoucher(id, dto, userId);
  }

  @Post('vouchers/:id/request-revision')
  @Roles('srcc_finance', 'admin')
  @ApiOperation({ summary: 'Request revision for a Payment Voucher (Finance Approver only)' })
  async requestVoucherRevision(
    @Param('id') id: string,
    @Body() dto: VoucherRevisionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.requestVoucherRevision(id, dto, userId);
  }

  @Post('vouchers/:id/pay')
  @Roles('srcc_finance', 'srcc_checker', 'admin')
  @ApiOperation({ summary: 'Mark Voucher as Paid & upload Payment Advice (Finance only)' })
  async payVoucher(
    @Param('id') id: string,
    @Body() dto: PayVoucherDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.service.payVoucher(id, dto, userId);
  }
}
