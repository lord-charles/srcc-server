import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @ApiProperty({
    description: 'Description of the contract',
    example: 'Project Manager Contract for Health System Upgrade',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Type of contract',
    example: 'coach',
    required: false,
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'The total value of the contract',
    example: 50000,
  })
  @IsNumber()
  @IsNotEmpty()
  contractValue: number;

  @ApiProperty({
    description: 'Currency for the contract value',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Contract start date',
    example: '2024-01-01',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    description: 'Contract end date',
    example: '2024-12-31',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({
    description: 'Reference to the associated project',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Optional reference to the milestone this contract is for',
    example: '60d21b4667d0d8992e610c86',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  milestoneId?: string;

  @ApiProperty({
    description:
      'Reference to the contracted user (team member or project manager)',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  contractedUserId: string;

  @ApiProperty({
    description: 'Contract status',
    enum: [
      'draft',
      'pending_signature',
      'active',
      'suspended',
      'terminated',
      'completed',
    ],
    default: 'draft',
  })
  @IsEnum([
    'draft',
    'pending_signature',
    'active',
    'suspended',
    'terminated',
    'completed',
  ])
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'History of contract amendments',
    type: [Object],
    required: false,
  })
  @IsOptional()
  amendments?: {
    date: Date;
    description: string;
    changedFields: string[];
    approvedBy: string;
  }[];

  @ApiProperty({
    description: 'Optional reference to the contract template to use',
    example: '60d21b4667d0d8992e610c85',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  templateId?: string;

  @ApiProperty({
    description:
      'Edited template content (if admin made changes to the template)',
    required: false,
  })
  @IsString()
  @IsOptional()
  editedTemplateContent?: string;

  @ApiProperty({
    description: 'Optional attachments (URLs) to include with this contract',
    required: false,
    type: () => [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class AttachmentDto {
  @ApiProperty({ example: 'Signed Offer Letter' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../offer.pdf' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'supporting', required: false })
  @IsOptional()
  @IsString()
  type?: string;
}
