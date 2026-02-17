import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RiskAssessmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  factors?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mitigationStrategies?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastAssessmentDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextAssessmentDate?: string;
}

export class UpdateProjectDetailsDto {
  @ApiProperty({ required: false, example: 'SRCC' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalProjectValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  client?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum([
    'draft',
    'pending_approval',
    'active',
    'on_hold',
    'completed',
    'cancelled',
  ])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  procurementMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => RiskAssessmentDto)
  riskAssessment?: RiskAssessmentDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['Weekly', 'Biweekly', 'Monthly', 'Quarterly'])
  reportingFrequency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amountSpent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
