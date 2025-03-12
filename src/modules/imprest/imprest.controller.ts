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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImprestService } from './imprest.service';
import { CreateImprestDto } from './dto/create-imprest.dto';
import { ImprestApprovalDto, ImprestRejectionDto, ImprestAccountingDto } from './dto/imprest-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Imprest')
@Controller('imprest')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImprestController {
  constructor(private readonly imprestService: ImprestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new imprest request' })
  @ApiResponse({ status: 201, description: 'Imprest request created successfully.' })
  async create(@Body() createImprestDto: CreateImprestDto, @Req() req: any) {
    return this.imprestService.create(createImprestDto, req.user.id);
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
    @Body('amount') amount: number,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Valid disbursement amount is required');
    }
    return this.imprestService.recordDisbursement(id, req.user.id, amount);
  }

  @Post(':id/account')
  @ApiOperation({ summary: 'Submit imprest accounting' })
  @ApiResponse({ status: 200, description: 'Imprest accounting submitted.' })
  async submitAccounting(
    @Param('id') id: string,
     @Req() req: any,
    @Body() accountingDto: ImprestAccountingDto,
  ) {
    return this.imprestService.submitAccounting(id, req.user.id, accountingDto);
  }
}
