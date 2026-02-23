import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDate,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MilestoneDto {
  @ApiProperty({
    example: 'Phase 1 Completion',
    description: 'Title of the milestone',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Complete initial system setup',
    description: 'Description of the milestone',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Start date for the milestone',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    example: '2024-12-31',
    description: 'Due date for the milestone',
  })
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @ApiProperty({
    example: false,
    description: 'Whether the milestone is completed',
  })
  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @ApiProperty({
    example: '2024-12-25',
    description: 'Date when the milestone was completed',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  completionDate?: Date;

  @ApiProperty({
    example: 50000,
    description: 'Planned budget for the milestone',
  })
  @IsNumber()
  budget: number;

  @ApiProperty({
    example: 48000,
    description: 'Actual cost incurred for the milestone',
  })
  @IsNumber()
  @IsOptional()
  actualCost?: number;

  @ApiProperty({
    example: 30,
    description: 'Percentage of the project this milestone represents',
  })
  @IsNumber()
  @IsOptional()
  percentage?: number;
}
