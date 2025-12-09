import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  Delete,
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
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Req() req: any, @Body() dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiResponse({
    status: 200,
    description: 'List of all budgets',
    type: [Budget],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(): Promise<Budget[]> {
    return this.budgetService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a budget by ID',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: '65d4a5e9c1656d8f4c0c2d1e',
      },
    ],
  })
  @ApiResponse({ status: 200, description: 'Budget found', type: Budget })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async findOne(@Param('id') id: string): Promise<Budget> {
    return this.budgetService.findOne(new Types.ObjectId(id));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a budget',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: '65d4a5e9c1656d8f4c0c2d1e',
      },
    ],
  })
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
    return this.budgetService.update(new Types.ObjectId(id), req.user.sub, dto);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit budget for approval',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: '65d4a5e9c1656d8f4c0c2d1e',
      },
    ],
  })
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
      req.user.sub,
    );
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve a budget',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: '65d4a5e9c1656d8f4c0c2d1e',
      },
    ],
  })
  @ApiResponse({ status: 200, description: 'Budget approved', type: Budget })
  async approve(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: BudgetApprovalDto,
  ): Promise<Budget> {
    return this.budgetService.approve(
      new Types.ObjectId(id),
      req.user.sub,
      dto,
    );
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject a budget',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: '65d4a5e9c1656d8f4c0c2d1e',
      },
    ],
  })
  @ApiResponse({ status: 200, description: 'Budget rejected', type: Budget })
  async reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: BudgetRejectionDto,
  ): Promise<Budget> {
    return this.budgetService.reject(new Types.ObjectId(id), req.user.sub, dto);
  }

  @Post(':id/request-revision')
  @ApiOperation({
    summary: 'Request budget revision',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: '65d4a5e9c1656d8f4c0c2d1e',
      },
    ],
  })
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
      req.user.sub,
      dto,
    );
  }

  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get budget by project ID',
    parameters: [
      {
        name: 'projectId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: '65d4a5e9c1656d8f4c0c2d1e',
      },
    ],
  })
  @ApiResponse({ status: 200, description: 'Budget found', type: Budget })
  async findByProject(@Param('projectId') projectId: string): Promise<Budget> {
    return this.budgetService.findByProject(new Types.ObjectId(projectId));
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a budget',
    description:
      'Delete a budget. Only administrators can delete budgets. Approved budgets cannot be deleted.',
  })
  @ApiResponse({ status: 200, description: 'Budget deleted successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Only administrators can delete budgets, or budget is approved',
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.budgetService.remove(
      new Types.ObjectId(id),
      new Types.ObjectId(req.user.sub),
    );
  }
}
