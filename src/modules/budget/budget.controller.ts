import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Budget } from './schemas/budget.schema';

@ApiTags('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new budget',
    description: 'Creates a new budget with the provided details including project information, budget items, and financial data.'
  })
  @ApiResponse({
    status: 201,
    description: 'The budget has been successfully created.',
    type: Budget 
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid budget data provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid' })
  create(@Body() createBudgetDto: CreateBudgetDto) {
    return this.budgetService.create(createBudgetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiResponse({ status: 200, description: 'Return all budgets.' })
  findAll() {
    return this.budgetService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by id' })
  @ApiResponse({ status: 200, description: 'Return the budget.' })
  @ApiResponse({ status: 404, description: 'Budget not found.' })
  findOne(@Param('id') id: string) {
    return this.budgetService.findOne(id);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get budgets by project id' })
  @ApiResponse({ status: 200, description: 'Return the budgets for a project.' })
  findByProject(@Param('projectId') projectId: string) {
    return this.budgetService.findByProject(projectId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiResponse({ status: 200, description: 'The budget has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Budget not found.' })
  update(@Param('id') id: string, @Body() updateBudgetDto: UpdateBudgetDto) {
    return this.budgetService.update(id, updateBudgetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiResponse({ status: 200, description: 'The budget has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Budget not found.' })
  remove(@Param('id') id: string) {
    return this.budgetService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update budget status' })
  @ApiResponse({ status: 200, description: 'The budget status has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Budget not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.budgetService.updateBudgetStatus(id, status);
  }

}
