import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { ContractService } from '../services/contract.service';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { VerifyContractOtpDto } from '../dto/verify-contract-otp.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ContractApprovalDto, ContractRejectionDto } from '../dto/contract-approval.dto';

@ApiTags('contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContractController {
  private readonly logger = new Logger(ContractController.name);

  constructor(private readonly contractService: ContractService) { }

  @Post()
  // @Roles('admin', 'project_manager')
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The contract has been successfully created.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  async create(@Body() createContractDto: CreateContractDto, @Req() req) {
    return await this.contractService.create(
      createContractDto,
      req.user.sub,
    );
  }

  @Get()
  // @Roles('admin', 'project_manager')
  @ApiOperation({ summary: 'Get all contracts with optional filtering' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by contract status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all contracts.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findAll(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {};

    if (status) {
      filters['status'] = status;
    }

    if (startDate) {
      filters['startDate'] = startDate;
    }

    if (endDate) {
      filters['endDate'] = endDate;
    }

    return await this.contractService.findAll(filters);
  }

  @Get('project/:projectId')
  // @Roles('admin', 'project_manager', 'team_member')
  @ApiOperation({ summary: 'Get contracts by project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of contracts for the specified project.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found.',
  })
  async findByProject(@Param('projectId') projectId: string) {
    this.logger.log(`Retrieving contracts for project ${projectId}`);
    return await this.contractService.findByProject(projectId);
  }

  @Get('user/:userId')
  // @Roles('admin', 'project_manager', 'team_member')
  @ApiOperation({ summary: 'Get contracts by user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of contracts for the specified user.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findByUser(@Param('userId') userId: string, @Req() req) {
    // For team members, only allow them to see their own contracts
    if (req.user.roles.includes('team_member') && req.user.sub !== userId) {
      this.logger.warn(
        `User ${req.user.sub} attempted to access contracts for user ${userId}`,
      );
      throw new BadRequestException('You can only view your own contracts');
    }

    this.logger.log(`Retrieving contracts for user ${userId}`);
    const filters = { contractedUserId: userId };
    return await this.contractService.findAll(filters);
  }

  @Get('my-contracts')
  @ApiOperation({ summary: 'Get contracts for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of contracts for the current user.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findMyContracts(@Req() req) {
    return await this.contractService.findMyContracts(req.user.sub);
  }

  @Get(':id')
  // @Roles('admin', 'project_manager', 'team_member')
  @ApiOperation({ summary: 'Get a contract by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The contract details.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findOne(@Param('id') id: string, @Req() req) {
    this.logger.log(`Retrieving contract ${id}`);
    const contract = await this.contractService.findOne(id);

    // For team members, only allow them to see their own contracts
    if (
      req.user.roles.includes('team_member') &&
      contract.contractedUserId.toString() !== req.user.sub
    ) {
      this.logger.warn(
        `User ${req.user.sub} attempted to access contract ${id}`,
      );
      throw new BadRequestException('You can only view your own contracts');
    }

    return contract;
  }

  @Patch(':id')
  // @Roles('admin', 'project_manager')
  @ApiOperation({ summary: 'Update a contract' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The contract has been successfully updated.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @Req() req,
  ) {
    this.logger.log(`Updating contract ${id} by user ${req.user.sub}`);
    return await this.contractService.update(
      id,
      updateContractDto,
      req.user.sub,
    );
  }

  @Delete(':id')
  // @Roles('admin')
  @ApiOperation({ summary: 'Delete a contract' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The contract has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  async remove(@Param('id') id: string, @Req() req) {
    this.logger.log(`Deleting contract ${id} by user ${req.user.sub}`);
    await this.contractService.remove(id);
    return { message: 'Contract successfully deleted' };
  }

  @Post(':id/generate-otp')
  // @Roles('admin', 'project_manager', 'team_member')
  @ApiOperation({ summary: 'Generate OTP for contract acceptance' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP generated and sent to user.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract or user not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Contract already active or OTP recently requested.',
  })
  async generateOTP(@Param('id') id: string, @Req() req) {
    this.logger.log(
      `Generating OTP for contract ${id} requested by user ${req.user.sub}`,
    );

    // Get contract to check if user is authorized
    const contract = await this.contractService.findOne(id);

    // For team members, only allow them to generate OTP for their own contracts
    if (
      req.user.roles.includes('team_member') &&
      contract.contractedUserId.toString() !== req.user.sub
    ) {
      this.logger.warn(
        `User ${req.user.sub} attempted to generate OTP for contract ${id}`,
      );
      throw new BadRequestException(
        'You can only generate OTP for your own contracts',
      );
    }

    await this.contractService.generateOTP(id);
    return {
      message: 'OTP has been sent to your phone and email',
      expiresIn: '30 minutes',
    };
  }

  @Post(':id/verify-otp')
  // @Roles('admin', 'project_manager', 'team_member')
  @ApiOperation({ summary: 'Verify OTP and accept contract' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract accepted successfully.',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid OTP.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found or OTP expired.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Contract already active.',
  })
  async verifyOTP(
    @Param('id') id: string,
    @Body() verifyContractOtpDto: VerifyContractOtpDto,
    @Req() req,
  ) {
    const contract = await this.contractService.findOne(id);

    // For team members, only allow them to verify OTP for their own contracts
    if (
      req.user.roles.includes('team_member') &&
      contract.contractedUserId.toString() !== req.user.sub
    ) {
      this.logger.warn(
        `User ${req.user.sub} attempted to verify OTP for contract ${id}`,
      );
      throw new BadRequestException(
        'You can only verify OTP for your own contracts',
      );
    }

    const updatedContract =
      await this.contractService.verifyOTPAndAcceptContract(
        id,
        verifyContractOtpDto.otp,
        req.user.sub,
      );

    return {
      message: 'Contract accepted successfully',
      contract: updatedContract,
    };
  }

  @Post(':id/approve')
  // @Roles('finance_approver', 'managing_director')
  @ApiOperation({ summary: 'Approve a contract' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract approved successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid approval request or contract status.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async approve(
    @Param('id') id: string,
    @Body() approvalDto: ContractApprovalDto,
    @Req() req,
  ) {
    this.logger.log(`Approving contract ${id} by user ${req.user.sub}`);
    return await this.contractService.approve(id, req.user.sub, approvalDto);
  }

  @Post(':id/reject')
  // @Roles('finance_approver', 'managing_director')
  @ApiOperation({ summary: 'Reject a contract' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract rejected successfully.',
  })
  async reject(
    @Param('id') id: string,
    @Body() rejectionDto: ContractRejectionDto,
    @Req() req,
  ) {
    return await this.contractService.reject(id, req.user.sub, rejectionDto);
  }

}
