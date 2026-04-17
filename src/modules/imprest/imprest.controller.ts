import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { ImprestService } from './imprest.service';
import { CreateImprestDto } from './dto/create-imprest.dto';
import {
  ImprestApprovalDto,
  ImprestRejectionDto,
  ReceiptDto,
  ImprestDisbursementDto,
  ImprestAcknowledgmentDto,
  ImprestDisputeResolutionDto,
  ImprestRevisionDto,
  ImprestAccountingRevisionDto,
} from './dto/imprest-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Imprest')
@Controller('imprest')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImprestController {
  constructor(private readonly imprestService: ImprestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new imprest request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentReason: {
          type: 'string',
          example: 'TOTEMK Google Cloud Payment',
        },
        currency: { type: 'string', example: 'USD' },
        amount: { type: 'number', example: 1048.59 },
        paymentType: {
          type: 'string',
          enum: ['Contingency Cash', 'Travel Cash', 'Purchase Cash', 'Others'],
          example: 'Contingency Cash',
        },
        explanation: { type: 'string', example: 'January 2024 - January 2025' },
        attachmentUrls: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['https://res.cloudinary.com/...'],
        },
      },
      required: [
        'paymentReason',
        'currency',
        'amount',
        'paymentType',
        'explanation',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Imprest request created successfully.',
  })
  async create(@Body() createImprestDto: CreateImprestDto, @Req() req: any) {
    const attachments = [];

    // Convert attachment URLs to attachment objects
    if (createImprestDto.attachmentUrls?.length) {
      for (let i = 0; i < createImprestDto.attachmentUrls.length; i++) {
        attachments.push({
          fileName: `Attachment ${i + 1}`,
          fileUrl: createImprestDto.attachmentUrls[i],
          uploadedAt: new Date(),
        });
      }
    }

    return this.imprestService.create(
      createImprestDto,
      req.user.sub,
      attachments,
    );
  }

  @Get()
  // @Roles('admin', 'hod', 'accountant')
  @ApiOperation({ summary: 'Get all imprest requests with optional filters' })
  @ApiResponse({ status: 200, description: 'Returns all imprest requests.' })
  async findAll() {
    const filters = {};
    // if (status) filters['status'] = status;
    // if (department) filters['department'] = department;
    // if (requestedBy) filters['requestedBy'] = requestedBy;

    return this.imprestService.findAll(filters);
  }

  @Get('my-imprest')
  @ApiOperation({ summary: 'Get all imprest requests created by the user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all imprest requests created by the user.',
  })
  async findMyImprests(@Req() req: any) {
    return this.imprestService.findMyImprests(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific imprest request' })
  @ApiResponse({ status: 200, description: 'Returns the imprest request.' })
  @ApiResponse({ status: 404, description: 'Imprest request not found.' })
  async findOne(@Param('id') id: string) {
    return this.imprestService.findOne(id);
  }

  @Post(':id/approve/hod')
  // @Roles('hod')
  @ApiOperation({ summary: 'Approve imprest request by HOD' })
  @ApiResponse({ status: 200, description: 'Imprest request approved by HOD.' })
  async approveByHod(
    @Param('id') id: string,
    @Req() req: any,
    @Body() approvalDto: ImprestApprovalDto,
  ) {
    return this.imprestService.approveByHod(id, req.user.sub, approvalDto);
  }

  @Post(':id/approve/accountant')
  // @Roles('accountant')
  @ApiOperation({ summary: 'Approve imprest request by accountant' })
  @ApiResponse({
    status: 200,
    description: 'Imprest request approved by accountant.',
  })
  async approveByAccountant(
    @Param('id') id: string,
    @Req() req: any,
    @Body() approvalDto: ImprestApprovalDto,
  ) {
    return this.imprestService.approveByAccountant(
      id,
      req.user.sub,
      approvalDto,
    );
  }

  @Post(':id/reject')
  // @Roles('hod', 'accountant')
  @ApiOperation({ summary: 'Reject imprest request' })
  @ApiResponse({ status: 200, description: 'Imprest request rejected.' })
  async reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() rejectionDto: ImprestRejectionDto,
  ) {
    return this.imprestService.reject(id, req.user.sub, rejectionDto);
  }

  @Post(':id/disburse')
  // @Roles('accountant')
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
    return this.imprestService.recordDisbursement(
      id,
      req.user.sub,
      disbursementDto,
    );
  }

  @Post(':id/account')
  @ApiOperation({ summary: 'Submit imprest accounting' })
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
              receiptUrl: {
                type: 'string',
                example: 'https://res.cloudinary.com/...',
              },
            },
            required: ['description', 'amount', 'receiptUrl'],
          },
        },
        comments: { type: 'string' },
      },
      required: ['receipts'],
    },
  })
  @ApiResponse({ status: 200, description: 'Imprest accounting submitted.' })
  async submitAccounting(
    @Param('id') id: string,
    @Req() req: any,
    @Body() accountingDto: { receipts: ReceiptDto[]; comments?: string },
  ) {
    const { receipts, comments } = accountingDto;

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      throw new BadRequestException('Valid receipts data is required');
    }

    for (const receipt of receipts) {
      if (!receipt.receiptUrl) {
        throw new BadRequestException('Each receipt must include a receiptUrl');
      }
    }

    const processedReceipts = receipts.map((receipt) => ({
      description: receipt.description,
      amount: receipt.amount,
      receiptUrl: receipt.receiptUrl,
      uploadedAt: new Date(),
    }));

    return this.imprestService.submitAccounting(
      id,
      req.user.sub,
      { receipts, comments },
      processedReceipts,
    );
  }

  @Post(':id/accounting/approve')
  // @Roles('accountant')
  @ApiOperation({ summary: 'Approve imprest accounting (accountant only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comments: {
          type: 'string',
          example: 'All receipts verified, OK for closure.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Imprest accounting approved.' })
  async approveAccounting(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { comments?: string },
  ) {
    return this.imprestService.approveAccounting(
      id,
      req.user.sub,
      body.comments,
    );
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge receipt of imprest funds' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        received: {
          type: 'boolean',
          example: true,
          description: 'Whether the user received the money',
        },
        comments: {
          type: 'string',
          example: 'Money received successfully',
          description: 'Optional comments about the receipt',
        },
      },
      required: ['received'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt acknowledged successfully.',
  })
  async acknowledgeReceipt(
    @Param('id') id: string,
    @Req() req: any,
    @Body() acknowledgmentDto: ImprestAcknowledgmentDto,
  ) {
    return this.imprestService.acknowledgeReceipt(
      id,
      req.user.sub,
      acknowledgmentDto,
    );
  }

  @Post(':id/resolve-dispute')
  // @Roles('admin')
  @ApiOperation({
    summary: 'Resolve imprest disbursement dispute (admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resolution: {
          type: 'string',
          enum: ['disbursed', 'cancelled'],
          example: 'disbursed',
          description: 'Resolution action',
        },
        adminComments: {
          type: 'string',
          example: 'Issue resolved, money re-disbursed',
          description: 'Admin comments about the resolution',
        },
      },
      required: ['resolution'],
    },
  })
  @ApiResponse({ status: 200, description: 'Dispute resolved successfully.' })
  async resolveDispute(
    @Param('id') id: string,
    @Req() req: any,
    @Body() resolutionDto: ImprestDisputeResolutionDto,
  ) {
    return this.imprestService.resolveDispute(id, req.user.sub, resolutionDto);
  }

  @Post(':id/request-revision')
  @ApiOperation({
    summary: 'Request revision for an imprest request (admin/HOD/accountant)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'Please provide more details on the payment breakdown',
          description: 'Reason for requesting revision',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Revision requested successfully.',
  })
  async requestRevision(
    @Param('id') id: string,
    @Req() req: any,
    @Body() revisionDto: ImprestRevisionDto,
  ) {
    return this.imprestService.requestRevision(id, req.user.sub, revisionDto);
  }

  @Patch(':id/update')
  @ApiOperation({ summary: 'Update and resubmit a draft imprest request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentReason: {
          type: 'string',
          example: 'Updated Google Cloud Payment',
        },
        currency: { type: 'string', example: 'USD' },
        amount: { type: 'number', example: 1048.59 },
        paymentType: {
          type: 'string',
          enum: ['Contingency Cash', 'Travel Cash', 'Purchase Cash', 'Others'],
          example: 'Contingency Cash',
        },
        explanation: { type: 'string', example: 'Updated explanation' },
        attachmentUrls: {
          type: 'array',
          items: { type: 'string' },
          example: ['https://res.cloudinary.com/...'],
        },
      },
      required: [
        'paymentReason',
        'currency',
        'amount',
        'paymentType',
        'explanation',
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Imprest request updated and resubmitted successfully.',
  })
  async updateAndResubmit(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: CreateImprestDto,
  ) {
    const attachments = [];

    if (updateDto.attachmentUrls?.length) {
      for (let i = 0; i < updateDto.attachmentUrls.length; i++) {
        attachments.push({
          fileName: `Attachment ${i + 1}`,
          fileUrl: updateDto.attachmentUrls[i],
          uploadedAt: new Date(),
        });
      }
    }

    return this.imprestService.updateAndResubmit(
      id,
      req.user.sub,
      updateDto,
      attachments,
    );
  }

  @Post(':id/accept-dispute-resolution')
  @ApiOperation({
    summary: 'Accept a resolved dispute (requester only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dispute resolution accepted, status set to disbursed.',
  })
  async acceptDisputeResolution(@Param('id') id: string, @Req() req: any) {
    return this.imprestService.acceptResolvedDispute(id, req.user.sub);
  }

  @Post(':id/request-accounting-revision')
  @ApiOperation({
    summary: 'Request revision on submitted accounting (admin/accountant only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'Receipts do not match the claimed amounts',
          description: 'Reason for requesting accounting revision',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Accounting revision requested, status set to disbursed.',
  })
  async requestAccountingRevision(
    @Param('id') id: string,
    @Req() req: any,
    @Body() revisionDto: ImprestAccountingRevisionDto,
  ) {
    return this.imprestService.requestAccountingRevision(
      id,
      req.user.sub,
      revisionDto,
    );
  }
}
