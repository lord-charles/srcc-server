import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import {  Types } from 'mongoose';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Claims')
@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new claim',
    description: 'Creates a new claim for a project. The claim must include at least one milestone and can optionally include supporting documents and bank account details.'
  })
  @ApiBody({
    type: CreateClaimDto,
    examples: {
      fullClaim: {
        summary: 'Complete claim with all fields',
        value: {
          projectId: '65123456789012345678901234',
          contractId: '65123456789012345678901235',
          amount: 50000,
          currency: 'KES',
          milestones: [
            {
              milestoneId: '65123456789012345678901236',
              title: 'UI Development Phase 1',
              percentageClaimed: 75
            }
          ],
          documents: [
            {
              url: 'https://storage.example.com/docs/invoice-123.pdf',
              name: 'March Invoice',
              type: 'invoice'
            },
            {
              url: 'https://storage.example.com/docs/timesheet-123.pdf',
              name: 'March Timesheet',
              type: 'timesheet'
            }
          ],
          bankAccount: {
            accountName: 'John Doe',
            accountNumber: '1234567890',
            bankName: 'Equity Bank',
            branchName: 'Westlands'
          },
          notes: 'Completing milestone for UI development phase 1'
        }
      },
      simpleClaim: {
        summary: 'Simple milestone claim',
        value: {
          projectId: '65123456789012345678901234',
          contractId: '65123456789012345678901235',
          amount: 25000,
          currency: 'KES',
          milestones: [
            {
              milestoneId: '65123456789012345678901236',
              title: 'Backend API Development',
              percentageClaimed: 50
            }
          ]
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Claim created successfully. Returns the created claim object with status "draft".'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error. Possible reasons: Invalid project/contract ID, amount less than 0, missing required fields, invalid milestone configuration'
  })
  @ApiResponse({ status: 404, description: 'Project, contract, or milestone not found' })
  create(@Body() createClaimDto: CreateClaimDto, @Request() req: any) {
    return this.claimsService.create(createClaimDto, new Types.ObjectId(req.user.sub));
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all claims for the authenticated user',
    description: 'Returns all claims where the user is either the claimant or an approver. Claims are returned as ClaimDocument objects.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns an array of ClaimDocument objects with populated project, contract, and user references'
  })
  findAll(@Request() req: any) {
    return this.claimsService.findAll(new Types.ObjectId(req.user.sub));
  }

  
  @Get('claims')
  // @Roles('admin', 'finance_approver', 'claim_manager')
  @ApiOperation({ summary: 'Get all claims with optional date filtering' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter claims from this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter claims until this date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all claims with populated references',
  })
  async findAllClaims(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {};
    
    if (startDate) {
      filters['createdAt'] = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      filters['createdAt'] = { 
        ...filters['createdAt'],
        $lte: new Date(endDate)
      };
    }

    return await this.claimsService.findAllClaims(filters);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a specific claim by ID',
    description: 'Returns detailed information about a specific claim as a ClaimDocument, including its approval history and milestone details.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the ClaimDocument with populated references'
  })
  @ApiResponse({ status: 403, description: 'User is not authorized to view this claim' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.claimsService.findOne(id, new Types.ObjectId(req.user.sub));
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a claim',
    description: 'Updates a draft or revision_requested claim. Only the claim owner can update it. All fields are optional but must match validation rules when provided.'
  })
  @ApiBody({
    type: UpdateClaimDto,
    examples: {
      updateMilestones: {
        summary: 'Update milestone details',
        value: {
          amount: 45000,
          milestones: [
            {
              milestoneId: '65123456789012345678901236',
              title: 'UI Development Phase 1',
              percentageClaimed: 80
            }
          ],
          notes: 'Updated milestone completion percentage based on latest progress'
        }
      },
      updateDocuments: {
        summary: 'Add supporting documents',
        value: {
          documents: [
            {
              url: 'https://storage.example.com/docs/invoice-124.pdf',
              name: 'Updated Invoice',
              type: 'invoice'
            },
            {
              url: 'https://storage.example.com/docs/timesheet-124.pdf',
              name: 'Updated Timesheet',
              type: 'timesheet'
            }
          ]
        }
      },
      updateBankDetails: {
        summary: 'Update bank account details',
        value: {
          bankAccount: {
            accountName: 'John Doe',
            accountNumber: '1234567890',
            bankName: 'Equity Bank',
            branchName: 'Westlands'
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Claim updated successfully. Returns the updated ClaimDocument.'
  })
  @ApiResponse({ 
    status: 400, 
    description: `Validation error. Possible reasons:
    - Amount less than 0
    - Invalid milestone configuration
    - Invalid document type (must be one of: invoice, receipt, timesheet, report, other)
    - Claim not in editable status (must be draft or revision_requested)
    - Invalid bank account details`
  })
  @ApiResponse({ status: 403, description: 'User is not the claim owner' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  update(
    @Param('id') id: string,
    @Body() updateClaimDto: UpdateClaimDto,
    @Request() req: any,
  ) {
    return this.claimsService.update(id, updateClaimDto, new Types.ObjectId(req.user.sub));
  }

  @Post(':id/submit')
  @ApiOperation({ 
    summary: 'Submit a claim for approval',
    description: 'Submits a draft claim for approval. This will start the approval workflow starting with checker approval.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Claim submitted successfully. Returns updated ClaimDocument with status "pending_checker_approval"'
  })
  @ApiResponse({ status: 400, description: 'Claim is not in draft status or missing required fields' })
  @ApiResponse({ status: 403, description: 'User is not the claim owner' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  submit(@Param('id') id: string, @Request() req: any) {
    return this.claimsService.submit(id, new Types.ObjectId(req.user.sub));
  }

  @Post(':id/approve')
  @ApiOperation({ 
    summary: 'Approve a claim',
    description: 'Approves a claim at the current approval level. Requires appropriate role (checker/manager/finance). Updates claim status based on approval flow.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['comments'],
      properties: {
        comments: {
          type: 'string',
          example: 'All milestones verified and completed as claimed',
          description: 'Approval comments explaining the decision'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: `Returns updated ClaimDocument with:
    - Updated status based on approval flow
    - New approval details in the approval object
    - Updated audit trail
    - Next level deadline if applicable`
  })
  @ApiResponse({ 
    status: 400, 
    description: `Invalid request. Possible reasons:
    - Missing approval comments
    - Claim not in correct status for approval
    - Invalid approval flow state`
  })
  @ApiResponse({ status: 403, description: 'User does not have required role for current approval level' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  // @Roles('claim_checker', 'claim_manager', 'finance_approver')
  approve(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @Request() req: any,
  ) {
    if (!comments) {
      throw new BadRequestException('Comments are required for approval');
    }
    return this.claimsService.approve(id, comments, new Types.ObjectId(req.user.sub));
  }

  @Post(':id/reject')
  @ApiOperation({ 
    summary: 'Reject a claim',
    description: 'Rejects a claim at any approval level. Requires appropriate role. Sets claim status to rejected.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: {
          type: 'string',
          example: 'Milestone completion evidence not sufficient',
          description: 'Detailed reason for rejection'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns updated ClaimDocument with status "rejected" and rejection details'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Missing rejection reason or claim not in rejectable status'
  })
  @ApiResponse({ status: 403, description: 'User does not have required role for current approval level' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  // @Roles('claim_checker', 'claim_manager', 'finance_approver')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    if (!reason) {
      throw new BadRequestException('Reason is required for rejection');
    }
    return this.claimsService.reject(id, reason, new Types.ObjectId(req.user.sub));
  }

  @Post(':id/request-revision')
  @ApiOperation({ 
    summary: 'Request revision for a claim',
    description: 'Requests changes to a claim. The claim will be returned to draft status for the claimant to update.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason', 'returnToStatus'],
      properties: {
        reason: {
          type: 'string',
          example: 'Please update milestone completion percentage',
          description: 'Main reason for requesting revision'
        },
        returnToStatus: {
          type: 'string',
          example: 'draft',
          enum: ['draft'],
          description: 'Status to return the claim to'
        },
        comments: {
          type: 'string',
          example: 'Milestone 2 seems to be only 60% complete',
          description: 'Additional details about required changes'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns updated ClaimDocument with status changed to specified return status'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Missing required fields or invalid return status'
  })
  @ApiResponse({ status: 403, description: 'User does not have required role for current approval level' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  // @Roles('claim_checker', 'claim_manager', 'finance_approver')
  requestRevision(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('returnToStatus') returnToStatus: string,
    @Body('comments') comments: string,
    @Request() req: any,
  ) {
    if (!reason || !returnToStatus) {
      throw new BadRequestException('Reason and returnToStatus are required for revision request');
    }
    return this.claimsService.requestRevision(
      id,
      new Types.ObjectId(req.user.sub),
      reason,
      returnToStatus,
      comments,
    );
  }

  @Post(':id/mark-as-paid')
  @ApiOperation({ 
    summary: 'Mark a claim as paid',
    description: 'Records payment details for an approved claim. Only available to finance approvers. Updates claim status to paid.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentMethod', 'transactionId'],
      properties: {
        paymentMethod: {
          type: 'string',
          example: 'bank_transfer',
          enum: ['bank_transfer', 'mpesa', 'cheque'],
          description: 'Method used for payment'
        },
        transactionId: {
          type: 'string',
          example: 'TRX123456789',
          description: 'Unique transaction identifier from the payment system'
        },
        reference: {
          type: 'string',
          example: 'INV/2025/001',
          description: 'Optional payment reference or invoice number'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns updated ClaimDocument with status "paid" and payment details'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Missing payment details, claim not in approved status, or invalid payment method'
  })
  @ApiResponse({ status: 403, description: 'User does not have finance_approver role' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  // @Roles('finance_approver')
  markAsPaid(
    @Param('id') id: string,
    @Body() paymentDetails: {
      paymentMethod: string;
      transactionId: string;
      reference: string;
    },
    @Request() req: any,
  ) {
    if (!paymentDetails.paymentMethod || !paymentDetails.transactionId) {
      throw new BadRequestException('Payment method and transaction ID are required');
    }
    return this.claimsService.markAsPaid(id, paymentDetails, new Types.ObjectId(req.user.sub));
  }

  @Post(':id/cancel')
  @ApiOperation({ 
    summary: 'Cancel a claim',
    description: 'Cancels a claim. Only the claim owner can cancel their claim, and only if it\'s in draft status.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns updated ClaimDocument with status "cancelled"'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Claim cannot be cancelled in current status'
  })
  @ApiResponse({ status: 403, description: 'User is not the claim owner' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.claimsService.cancel(id, new Types.ObjectId(req.user.sub));
  }

  @Get('by-contract/:contractId')
  @ApiOperation({ 
    summary: 'Get all claims for a specific contract',
    description: 'Returns all claims associated with the given contract ID, sorted by creation date in descending order. Includes milestone details and populated references.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns an array of ClaimDocument objects with populated references including project, contract, claimant, and milestone details'
  })
  @ApiResponse({ status: 400, description: 'Invalid contract ID format' })
  async findClaimsByContract(@Param('contractId') contractId: string, @Request() req: any) {
    return await this.claimsService.findClaimsByContract(contractId, req.user.sub);
  }
}
