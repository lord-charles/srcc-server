import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { Schema as MongooseSchema } from 'mongoose';

export class UpdateProjectManagerDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Project manager user ID' })
  @IsMongoId()
  @IsOptional()
  projectManagerId?: MongooseSchema.Types.ObjectId;
}
