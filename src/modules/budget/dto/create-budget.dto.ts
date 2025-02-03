import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsDate, IsEnum, IsOptional, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

class BudgetItemDto {
  @ApiProperty({
    example: 'Foundation Work',
    description: 'Name of the budget item'
  })
  @IsString()
  itemName: string;

  @ApiProperty({
    example: 1200000,
    description: 'Planned cost for this item'
  })
  @IsNumber()
  plannedCost: number;

  @ApiProperty({
    example: 400000,
    description: 'Actual cost incurred for this item',
    required: false
  })
  @IsNumber()
  @IsOptional()
  actualCost?: number;

  @ApiProperty({
    example: 'Complete foundation and ground work',
    description: 'Detailed description of the budget item',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '2025-02-15T00:00:00.000Z',
    description: 'Date when the cost was incurred',
    required: false
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dateIncurred?: Date;
}

export class CreateBudgetDto {
  @ApiProperty({
    example: 'School Construction Project Phase 1',
    description: 'Name of the project'
  })
  @IsString()
  projectName: string;

  @ApiProperty({
    example: 5000000,
    description: 'Total value of the project in the specified currency'
  })
  @IsNumber()
  projectValue: number;

  @ApiProperty({
    example: '2025-02-01T00:00:00.000Z',
    description: 'Start date of the budget period'
  })
  @IsDate()
  @Type(() => Date)
  budgetStartDate: Date;

  @ApiProperty({
    example: '2025-12-31T00:00:00.000Z',
    description: 'End date of the budget period'
  })
  @IsDate()
  @Type(() => Date)
  budgetEndDate: Date;

  @ApiProperty({
    example: 'Construction',
    description: 'Category of the budget (e.g., Construction, IT, Marketing)'
  })
  @IsString()
  budgetCategory: string;

  @ApiProperty({
    example: 'KES',
    description: 'Currency code used in the budget (ISO 4217)',
    default: 'KES'
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    example: 4800000,
    description: 'Total planned cost for all budget items'
  })
  @IsNumber()
  totalPlannedCost: number;

  @ApiProperty({
    example: 1200000,
    description: 'Total actual cost incurred so far',
    default: 0
  })
  @IsNumber()
  @IsOptional()
  totalActualCost?: number;

  @ApiProperty({
    example: 'active',
    description: 'Current status of the budget',
    enum: ['active', 'completed', 'pending'],
    default: 'pending'
  })
  @IsEnum(['active', 'completed', 'pending'])
  @IsOptional()
  status?: string;

  @ApiProperty({
    example: 'Initial budget for school construction project phase 1, including foundation and basic structure',
    description: 'Additional notes or comments about the budget',
    required: false
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    type: [BudgetItemDto],
    example: [
      {
        itemName: 'Foundation Work',
        plannedCost: 1200000,
        actualCost: 400000,
        description: 'Complete foundation and ground work',
        dateIncurred: '2025-02-15T00:00:00.000Z'
      },
      {
        itemName: 'Building Materials',
        plannedCost: 2500000,
        actualCost: 800000,
        description: 'All construction materials including cement, steel, and bricks',
        dateIncurred: '2025-03-01T00:00:00.000Z'
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  budgetItems: BudgetItemDto[];

  @ApiProperty({
    example: '65be1234c52d3e001234abce',
    description: 'MongoDB ObjectId of the related project'
  })
  @IsMongoId()
  projectId: Types.ObjectId;

  @ApiProperty({
    example: '65be1234c52d3e001234abcf',
    description: 'MongoDB ObjectId of the budget owner'
  })
  @IsMongoId()
  budgetOwner: Types.ObjectId;
}
