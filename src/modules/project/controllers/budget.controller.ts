import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BudgetService } from '../services/budget.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetApprovalDto,
  BudgetRejectionDto,
  BudgetRevisionDto,
} from '../dto/budget.dto';
import { Budget } from '../schemas/budget.schema';

@ApiTags('Budgets')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({
    status: 201,
    description: 'Budget created successfully',
    type: Budget,
  })
  async create(@Req() req: any, @Body() dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiResponse({ status: 200, description: 'Budget found', type: Budget })
  async findOne(@Param('id') id: string): Promise<Budget> {
    return this.budgetService.findOne(new Types.ObjectId(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiResponse({
    status: 200,
    description: 'Budget updated successfully',
    type: Budget,
  })
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateBudgetDto,
  ): Promise<Budget> {
    return this.budgetService.update(new Types.ObjectId(id), req.user.id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit budget for approval' })
  @ApiResponse({
    status: 200,
    description: 'Budget submitted for approval',
    type: Budget,
  })
  async submitForApproval(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Budget> {
    return this.budgetService.submitForApproval(
      new Types.ObjectId(id),
      req.user.id,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a budget' })
  @ApiResponse({ status: 200, description: 'Budget approved', type: Budget })
  async approve(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: BudgetApprovalDto,
  ): Promise<Budget> {
    return this.budgetService.approve(new Types.ObjectId(id), req.user.id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a budget' })
  @ApiResponse({ status: 200, description: 'Budget rejected', type: Budget })
  async reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: BudgetRejectionDto,
  ): Promise<Budget> {
    return this.budgetService.reject(new Types.ObjectId(id), req.user.id, dto);
  }

  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request budget revision' })
  @ApiResponse({
    status: 200,
    description: 'Budget revision requested',
    type: Budget,
  })
  async requestRevision(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: BudgetRevisionDto,
  ): Promise<Budget> {
    return this.budgetService.requestRevision(
      new Types.ObjectId(id),
      req.user.id,
      dto,
    );
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get budget by project ID' })
  @ApiResponse({ status: 200, description: 'Budget found', type: Budget })
  async findByProject(@Param('projectId') projectId: string): Promise<Budget> {
    return this.budgetService.findByProject(new Types.ObjectId(projectId));
  }
}
