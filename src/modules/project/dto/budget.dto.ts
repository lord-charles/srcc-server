import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

export class CreateBudgetItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBudgetDto {
  @ApiProperty()
  @IsMongoId()
  projectId: Types.ObjectId;

  @ApiProperty({ type: [CreateBudgetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetItemDto)
  items: CreateBudgetItemDto[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBudgetItemDto extends CreateBudgetItemDto {
  @ApiProperty()
  @IsMongoId()
  itemId: Types.ObjectId;
}

export class UpdateBudgetDto {
  @ApiProperty({ type: [UpdateBudgetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBudgetItemDto)
  items: UpdateBudgetItemDto[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BudgetApprovalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comments?: string;
}

export class BudgetRejectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty()
  @IsEnum(['checker', 'manager', 'finance'])
  level: string;
}

export class BudgetRevisionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comments: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  changes: string[];
}
