import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateBudgetItemDto {
  @ApiProperty({
    example: 'Software Development Team',
    description: 'Name of the budget item'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Monthly salary allocation for the development team',
    description: 'Detailed description of the budget item'
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 500000,
    description: 'Estimated amount for this item in the budget currency'
  })
  @IsNumber()
  @IsNotEmpty()
  estimatedAmount: number;

  @ApiProperty({
    example: 450000,
    description: 'Actual amount spent on this item',
    required: false
  })
  @IsNumber()
  @IsOptional()
  actualAmount?: number;

  @ApiProperty({
    example: ['salary', 'internal', 'development'],
    description: 'Tags to categorize and filter the budget item',
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: 'monthly',
    description: 'Frequency of the expense',
    enum: ['one-time', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  })
  @IsString()
  @IsEnum(['one-time', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
  frequency: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Start date for recurring items',
    required: false
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    example: '2024-12-31',
    description: 'End date for recurring items',
    required: false
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    example: {
      rate: 5000,
      units: 'hours',
      quantity: 160,
      notes: 'Based on 8 hours per day, 20 days per month'
    },
    description: 'Additional metadata for calculations',
    required: false
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateBudgetCategoryDto {
  @ApiProperty({
    example: 'Human Resources',
    description: 'Name of the budget category'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'All HR related expenses including salaries, benefits, and training',
    description: 'Detailed description of what this category covers'
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    type: [CreateBudgetItemDto],
    example: [{
      name: 'Software Development Team',
      description: 'Monthly salary allocation for the development team',
      estimatedAmount: 500000,
      actualAmount: 450000,
      tags: ['salary', 'internal', 'development'],
      frequency: 'monthly',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      metadata: {
        rate: 5000,
        units: 'hours',
        quantity: 160
      }
    }, {
      name: 'Training Budget',
      description: 'Annual training and skill development budget',
      estimatedAmount: 100000,
      tags: ['training', 'development'],
      frequency: 'yearly',
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetItemDto)
  items: CreateBudgetItemDto[];

  @ApiProperty({
    example: ['internal', 'operational'],
    description: 'Tags to categorize the budget category',
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class CreateBudgetDto {
  @ApiProperty({
    example: '65d4a5e9c1656d8f4c0c2d1e',
    description: 'ID of the project this budget belongs to'
  })
  @IsMongoId()
  projectId: Types.ObjectId;

  @ApiProperty({
    type: [CreateBudgetCategoryDto],
    example: [{
      name: 'Human Resources',
      description: 'All HR related expenses',
      items: [{
        name: 'Software Development Team',
        description: 'Monthly salary allocation',
        estimatedAmount: 500000,
        frequency: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }],
      tags: ['internal', 'operational']
    }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetCategoryDto)
  internalCategories: CreateBudgetCategoryDto[];

  @ApiProperty({
    type: [CreateBudgetCategoryDto],
    example: [{
      name: 'Cloud Infrastructure',
      description: 'All cloud service expenses',
      items: [{
        name: 'AWS Services',
        description: 'Monthly AWS cloud services',
        estimatedAmount: 100000,
        frequency: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }],
      tags: ['external', 'infrastructure']
    }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetCategoryDto)
  externalCategories: CreateBudgetCategoryDto[];

  @ApiProperty({
    example: 'KES',
    description: 'Currency for all amounts in the budget',
    default: 'KES'
  })
  @IsString()
  @IsOptional()
  currency?: string = 'KES';

  @ApiProperty({
    example: 4500000,
    description: 'Total internal budget amount'
  })
  @IsNumber()
  @IsNotEmpty()
  totalInternalBudget: number;

  @ApiProperty({
    example: 1500000,
    description: 'Total external budget amount'
  })
  @IsNumber()
  @IsNotEmpty()
  totalExternalBudget: number;

  @ApiProperty({
    example: 'Q1 2024 Project Budget',
    description: 'Additional notes about the budget',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBudgetItemDto extends CreateBudgetItemDto {
  @ApiProperty({
    example: '65d4a5e9c1656d8f4c0c2d1f',
    description: 'ID of the budget item to update'
  })
  @IsMongoId()
  itemId: Types.ObjectId;
}

export class UpdateBudgetCategoryDto extends CreateBudgetCategoryDto {
  @ApiProperty({
    example: '65d4a5e9c1656d8f4c0c2d1g',
    description: 'ID of the budget category to update'
  })
  @IsMongoId()
  categoryId: Types.ObjectId;
}

export class UpdateBudgetDto {
  @ApiProperty({
    type: [UpdateBudgetCategoryDto],
    example: [{
      categoryId: '65d4a5e9c1656d8f4c0c2d1g',
      name: 'Human Resources',
      description: 'Updated HR expenses description',
      items: [{
        itemId: '65d4a5e9c1656d8f4c0c2d1f',
        name: 'Software Development Team',
        description: 'Updated monthly salary allocation',
        estimatedAmount: 550000,
        frequency: 'monthly'
      }]
    }],
    description: 'Internal budget categories to update',
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBudgetCategoryDto)
  @IsOptional()
  internalCategories?: UpdateBudgetCategoryDto[];

  @ApiProperty({
    type: [UpdateBudgetCategoryDto],
    example: [{
      categoryId: '65d4a5e9c1656d8f4c0c2d1h',
      name: 'Cloud Infrastructure',
      description: 'Updated cloud expenses description',
      items: [{
        itemId: '65d4a5e9c1656d8f4c0c2d1i',
        name: 'AWS Services',
        description: 'Updated AWS services description',
        estimatedAmount: 120000,
        frequency: 'monthly'
      }]
    }],
    description: 'External budget categories to update',
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBudgetCategoryDto)
  @IsOptional()
  externalCategories?: UpdateBudgetCategoryDto[];

  @ApiProperty({
    example: 5000000,
    description: 'Updated total internal budget amount',
    required: false
  })
  @IsNumber()
  @IsOptional()
  totalInternalBudget?: number;

  @ApiProperty({
    example: 2000000,
    description: 'Updated total external budget amount',
    required: false
  })
  @IsNumber()
  @IsOptional()
  totalExternalBudget?: number;

  @ApiProperty({
    example: 'Updated Q1 2024 budget with revised allocations',
    description: 'Updated notes about the budget',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BudgetApprovalDto {
  @ApiProperty({
    example: 'Approved for Q1 2024',
    description: 'Comments for budget approval'
  })
  @IsString()
  @IsNotEmpty()
  comments?: string;
}

export class BudgetRejectionDto {
  @ApiProperty({
    example: 'Insufficient funds for Q1 2024',
    description: 'Reason for budget rejection'
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    example: 'finance',
    description: 'Level of budget rejection',
    enum: ['checker', 'manager', 'finance']
  })
  @IsEnum(['checker', 'manager', 'finance'])
  level: string;
}

export class BudgetRevisionDto {
  @ApiProperty({
    example: 'Revised budget for Q1 2024 with updated allocations',
    description: 'Comments for budget revision'
  })
  @IsString()
  @IsNotEmpty()
  comments: string;

  @ApiProperty({
    example: ['Updated internal budget', 'Updated external budget'],
    description: 'List of changes made in the budget revision'
  })
  @IsArray()
  @IsString({ each: true })
  changes: string[];
}
