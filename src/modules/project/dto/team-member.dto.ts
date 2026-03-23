import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsArray,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Schema as MongooseSchema } from 'mongoose';

export class TeamMemberDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Team member user ID',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  userId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Organization ID (alternative to userId)',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  organizationId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'Milestone ID (optional)',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  milestoneId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Start date in ISO 8601 format',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: Date;

  @ApiProperty({
    example: '2024-12-31T00:00:00.000Z',
    description: 'End date in ISO 8601 format',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  endDate?: Date;

  @ApiProperty({
    example: ['Frontend Development', 'UI/UX Design'],
    description: 'List of responsibilities',
  })
  @IsArray()
  @IsString({ each: true })
  responsibilities: string[];
}
