import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, IsDateString, IsArray, IsOptional } from 'class-validator';
import { Schema as MongooseSchema } from 'mongoose';

export class TeamMemberDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Team member user ID' })
  @IsMongoId()
  userId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ example: '2024-01-01', description: 'Start date' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ example: '2024-12-31', description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ example: ['Frontend Development', 'UI/UX Design'], description: 'List of responsibilities' })
  @IsArray()
  @IsString({ each: true })
  responsibilities: string[];
}
