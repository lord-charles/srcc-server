import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsDate, IsEnum, IsArray, IsOptional, IsMongoId, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty({ 
    example: 'Health System Upgrade',
    description: 'The name of the project. Should be unique and descriptive.'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 'A comprehensive project to upgrade the health system infrastructure including new equipment and staff training.',
    description: 'Detailed description of the project scope, objectives, and expected outcomes.'
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011',
    description: 'MongoDB ObjectId of the associated contract'
  })
  @IsNotEmpty()
  @IsMongoId()
  contractId: string;

  @ApiProperty({ 
    example: 5000000,
    description: 'Total budget allocated for the project in the specified currency'
  })
  @IsNotEmpty()
  @IsNumber()
  totalBudget: number;

  @ApiProperty({ 
    example: 4800000,
    description: 'Total estimated value of the project deliverables'
  })
  @IsNotEmpty()
  @IsNumber()
  totalProjectValue: number;

  @ApiProperty({ 
    example: 'USD',
    description: 'Currency code for all monetary values in the project'
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z',
    description: 'Date when the contract/project officially starts'
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  contractStartDate: Date;

  @ApiProperty({ 
    example: '2025-12-31T00:00:00.000Z',
    description: 'Date when the contract/project is scheduled to end'
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  contractEndDate: Date;

  @ApiProperty({ 
    example: 'Ministry of Health',
    description: 'Name of the client organization funding the project'
  })
  @IsNotEmpty()
  @IsString()
  client: string;

  @ApiProperty({ 
    example: 'draft',
    description: 'Current status of the project',
    enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled']
  })
  @IsNotEmpty()
  @IsEnum(['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled'])
  status: string;

  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011',
    description: 'MongoDB ObjectId of the assigned project manager'
  })
  @IsNotEmpty()
  @IsMongoId()
  projectManagerId: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/project-proposal.pdf',
    description: 'Cloudinary URL for the uploaded project proposal document'
  })
  // @IsNotEmpty()
  // @IsUrl()
  projectProposalUrl: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/signed-contract.pdf',
    description: 'Cloudinary URL for the uploaded signed contract document'
  })
  // @IsNotEmpty()
  // @IsUrl()
  signedContractUrl: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/execution-memo.pdf',
    description: 'Cloudinary URL for the uploaded contract execution memo'
  })
  // @IsNotEmpty()
  // @IsUrl()
  contractExecutionMemoUrl: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/signed-budget.pdf',
    description: 'Cloudinary URL for the uploaded signed budget document'
  })
  // @IsNotEmpty()
  // @IsUrl()
  signedBudgetUrl: string;

  @ApiProperty({ example: 'Public Procurement' })
  @IsNotEmpty()
  @IsString()
  procurementMethod: string;

  @ApiProperty({ type: [Object] })
  @IsOptional()
  @IsArray()
  milestones?: any[];

  @ApiProperty({ type: [Object] })
  @IsOptional()
  @IsArray()
  teamMembers?: any[];

  @ApiProperty({ type: [Object] })
  @IsOptional()
  @IsArray()
  documents?: any[];

  @ApiProperty({ example: 'High' })
  @IsNotEmpty()
  @IsEnum(['Low', 'Medium', 'High'])
  riskLevel: string;

  @ApiProperty()
  @IsOptional()
  riskAssessment?: {
    factors: string[];
    mitigationStrategies: string[];
    lastAssessmentDate: Date;
    nextAssessmentDate: Date;
  };

  @ApiProperty({ example: 'Monthly' })
  @IsNotEmpty()
  @IsEnum(['Weekly', 'Biweekly', 'Monthly', 'Quarterly'])
  reportingFrequency: string;

  @ApiProperty()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  actualCompletionDate?: Date;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsNumber()
  amountSpent?: number;

  @ApiProperty()
  @IsOptional()
  financialTracking?: {
    invoices: any[];
    expenses: any[];
  };

  @ApiProperty()
  @IsOptional()
  @IsArray()
  kpis?: any[];
}
